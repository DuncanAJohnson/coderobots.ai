"""
Modal serverless function for compiling Arduino sketches for ESP32 boards.

Uses arduino-cli with the ESP32 core pre-installed in the image. Returns a
single merged binary that the browser can flash at offset 0x0 via esptool-js,
avoiding the need to juggle bootloader/partitions/boot_app0 separately.
"""

import base64
import json
import logging
import os
import subprocess
import tempfile

import modal

logger = logging.getLogger(__name__)

app = modal.App("coderobots-esp32-compile")

ARDUINO_CLI_INSTALL = (
    "curl -fsSL "
    "https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh "
    "| BINDIR=/usr/local/bin sh"
)

image = (
    modal.Image.debian_slim()
    .apt_install("curl", "ca-certificates", "git", "python3")
    .run_commands(
        ARDUINO_CLI_INSTALL,
        "arduino-cli config init",
        "arduino-cli config set board_manager.additional_urls "
        "https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json",
        "arduino-cli core update-index",
        "arduino-cli core install esp32:esp32",
        "arduino-cli lib install \"Adafruit SSD1306\" \"Adafruit GFX Library\" "
        "\"Adafruit BusIO\" \"Adafruit Unified Sensor\" \"Adafruit ADXL345\"",
    )
)

DEFAULT_FQBN = "esp32:esp32:XIAO_ESP32C3"
ALLOWED_FQBNS = {
    "esp32:esp32:XIAO_ESP32C3",
    "esp32:esp32:esp32",
    "esp32:esp32:esp32s3",
    "esp32:esp32:esp32s2",
    "esp32:esp32:esp32c3",
}

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def _compile_sketch(sketch: str, fqbn: str) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        sketch_dir = os.path.join(tmp, "sketch")
        os.makedirs(sketch_dir)
        ino_path = os.path.join(sketch_dir, "sketch.ino")
        with open(ino_path, "w") as f:
            f.write(sketch)

        out_dir = os.path.join(tmp, "build")
        os.makedirs(out_dir)

        build_fqbn = f"{fqbn}:FlashMode=dio"

        result = subprocess.run(
            [
                "arduino-cli",
                "compile",
                "--fqbn",
                build_fqbn,
                "--output-dir",
                out_dir,
                "--warnings",
                "default",
                sketch_dir,
            ],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return {
                "ok": False,
                "error": "compile_failed",
                "stdout": result.stdout,
                "stderr": result.stderr,
            }

        merged_path = os.path.join(out_dir, "sketch.ino.merged.bin")
        if not os.path.exists(merged_path):
            # Fall back to raw firmware image if merged wasn't produced
            fw_path = os.path.join(out_dir, "sketch.ino.bin")
            if not os.path.exists(fw_path):
                return {
                    "ok": False,
                    "error": "no_binary_produced",
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                }
            with open(fw_path, "rb") as f:
                return {
                    "ok": True,
                    "flash_offset": 0x10000,
                    "binary": base64.b64encode(f.read()).decode("ascii"),
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                }

        with open(merged_path, "rb") as f:
            data = f.read()
        header_info = ""
        if len(data) >= 4 and data[0] == 0xE9:
            mode_names = {0: "QIO", 1: "QOUT", 2: "DIO", 3: "DOUT"}
            header_info = (
                f"\n[diag] merged.bin size={len(data)} "
                f"header: magic=0xE9 "
                f"spi_mode=0x{data[2]:02x} ({mode_names.get(data[2], '?')}) "
                f"spi_size_freq=0x{data[3]:02x}"
            )
        return {
            "ok": True,
            "flash_offset": 0x0,
            "binary": base64.b64encode(data).decode("ascii"),
            "stdout": result.stdout + header_info,
            "stderr": result.stderr,
        }


@app.function(
    image=image,
    timeout=300,
    cpu=2.0,
    scaledown_window=600,
)
@modal.concurrent(max_inputs=2, target_inputs=1)
@modal.fastapi_endpoint(method="POST")
async def compile_endpoint(request: dict):
    from fastapi.responses import JSONResponse

    sketch = request.get("sketch")
    fqbn = request.get("board") or DEFAULT_FQBN

    if not sketch or not isinstance(sketch, str):
        return JSONResponse(
            {"ok": False, "error": "missing_sketch"},
            status_code=400,
            headers=CORS_HEADERS,
        )

    if fqbn not in ALLOWED_FQBNS:
        return JSONResponse(
            {"ok": False, "error": "unsupported_board", "board": fqbn},
            status_code=400,
            headers=CORS_HEADERS,
        )

    try:
        result = _compile_sketch(sketch, fqbn)
    except Exception as exc:
        logger.exception("compile crashed")
        return JSONResponse(
            {"ok": False, "error": "server_error", "detail": str(exc)},
            status_code=500,
            headers=CORS_HEADERS,
        )

    status = 200 if result.get("ok") else 422
    return JSONResponse(result, status_code=status, headers=CORS_HEADERS)

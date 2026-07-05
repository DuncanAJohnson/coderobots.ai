"""
Modal serverless function for compiling Arduino sketches for ESP32 boards.

Uses arduino-cli with the ESP32 core pre-installed in the image. Returns both a
merged binary (bootloader+partitions+app at offset 0x0) and the raw app binary
(offset 0x10000) so the client can do app-only flashes for fast iteration.

Caching strategy (the reason this is fast):
- /cache (Modal Volume, cross-container):
    - /cache/results/<hash>.json    full response cache; instant return on
                                    identical sketch+fqbn+core
    - /cache/arduino-cache/         arduino-cli --build-cache-path; stores
                                    the compiled ESP32 core (core.a)
- /tmp (per-container, ephemeral but warm-reused):
    - /tmp/esp32-ws/<fqbn>/sketch/  stable sketch dir; arduino-cli reuses
                                    path-hashed metadata
    - /tmp/esp32-build/<fqbn>/      stable build dir; library .o files
                                    persist between calls so arduino-cli's
                                    timestamp-based incremental rebuild
                                    only recompiles what actually changed
                                    (the user's sketch.ino)
- A per-fqbn threading lock serializes concurrent compiles in the same
  container so two requests don't clobber each other's build dir.
- The image build pre-warms the kitchen-sink libraries so even the first
  call on a cold container has core.a + library .o files ready.
"""

import base64
import hashlib
import json
import logging
import os
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path

import modal

logger = logging.getLogger(__name__)

app = modal.App("coderobots-esp32-compile")

ARDUINO_CLI_INSTALL = (
    "curl -fsSL "
    "https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh "
    "| BINDIR=/usr/local/bin sh"
)

PREWARM_SKETCH_LINES = [
    "#include <Wire.h>",
    "#include <Adafruit_Sensor.h>",
    "#include <Adafruit_ADXL345_U.h>",
    "#include <Adafruit_GFX.h>",
    "#include <Adafruit_SSD1306.h>",
    "Adafruit_SSD1306 _pw_screen(128, 64, &Wire, -1);",
    "Adafruit_ADXL345_Unified _pw_adx = Adafruit_ADXL345_Unified(12345);",
    "void setup() { Wire.begin(); }",
    "void loop() {}",
]

# One-line shell command (no heredoc — Modal's Dockerfile parser rejects them).
# printf '%s\n' 'line1' 'line2' ... writes each arg on its own line.
PREWARM_CMD = (
    "mkdir -p /opt/prewarm/sketch /opt/prewarm/cache && "
    "printf '%s\\n' "
    + " ".join(f"'{line}'" for line in PREWARM_SKETCH_LINES)
    + " > /opt/prewarm/sketch/sketch.ino && "
    "arduino-cli compile "
    "--fqbn esp32:esp32:XIAO_ESP32C3:FlashMode=dio "
    "--build-cache-path /opt/prewarm/cache "
    "--build-path /opt/prewarm/build "
    "--output-dir /opt/prewarm/build "
    "/opt/prewarm/sketch || true"
)

image = (
    modal.Image.debian_slim()
    .apt_install("curl", "ca-certificates", "git", "python3")
    .pip_install("fastapi[standard]")
    .run_commands(
        ARDUINO_CLI_INSTALL,
        "arduino-cli config init",
        "arduino-cli config set board_manager.additional_urls "
        "https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json",
        "arduino-cli core update-index",
        "arduino-cli core install esp32:esp32",
        "arduino-cli lib install \"Adafruit SSD1306\" \"Adafruit GFX Library\" "
        "\"Adafruit BusIO\" \"Adafruit Unified Sensor\" \"Adafruit ADXL345\"",
        PREWARM_CMD,
    )
)

build_cache_vol = modal.Volume.from_name("esp32-build-cache", create_if_missing=True)
CACHE_MOUNT = "/cache"
PREWARM_CACHE_DIR = "/opt/prewarm/cache"

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


def _slugify(fqbn: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.-]", "_", fqbn)


def _esp32_core_version() -> str:
    """Used as a cache-key salt so a core upgrade invalidates result cache."""
    try:
        out = subprocess.run(
            ["arduino-cli", "core", "list", "--format", "json"],
            capture_output=True, text=True, timeout=10,
        )
        data = json.loads(out.stdout or "[]")
        # arduino-cli versions differ in shape; handle both list and {"platforms": [...]}
        platforms = data if isinstance(data, list) else data.get("platforms", [])
        for p in platforms:
            pid = p.get("id") or (p.get("platform") or {}).get("id")
            if pid == "esp32:esp32":
                return p.get("installed_version") or (p.get("platform") or {}).get("installed", "?")
    except Exception:
        pass
    return "unknown"


_CORE_VERSION = None


def _core_version_cached() -> str:
    global _CORE_VERSION
    if _CORE_VERSION is None:
        _CORE_VERSION = _esp32_core_version()
    return _CORE_VERSION


def _seed_cache_from_prewarm() -> None:
    """One-time seed: copy pre-warmed library .o files into the Volume cache
    if it's empty. After the first successful run, the Volume holds the
    artifacts and this is a no-op."""
    cache_dir = Path(CACHE_MOUNT) / "arduino-cache"
    if cache_dir.exists() and any(cache_dir.iterdir()):
        return
    src = Path(PREWARM_CACHE_DIR)
    if not src.exists():
        return
    cache_dir.mkdir(parents=True, exist_ok=True)
    for entry in src.iterdir():
        dest = cache_dir / entry.name
        if dest.exists():
            continue
        if entry.is_dir():
            shutil.copytree(entry, dest)
        else:
            shutil.copy2(entry, dest)


def _diag_cache_stats(stdout: str) -> str:
    """Surface how many compilation units were cache hits vs misses.
    arduino-cli is mostly silent when reusing .o files, so the most reliable
    signal is the count of 'Compiling ...' lines (= recompiles)."""
    hits = len(re.findall(r"Using previously compiled file", stdout))
    misses = len(re.findall(r"^Compiling ", stdout, flags=re.MULTILINE))
    return f"\n[diag] cache_hits={hits} cache_misses={misses}"


# Per-fqbn lock so two concurrent compiles in the same container don't clobber
# each other's stable build dir. Different fqbns don't contend.
_fqbn_locks: dict[str, threading.Lock] = {}
_fqbn_locks_guard = threading.Lock()


def _lock_for(fqbn_slug: str) -> threading.Lock:
    with _fqbn_locks_guard:
        lock = _fqbn_locks.get(fqbn_slug)
        if lock is None:
            lock = threading.Lock()
            _fqbn_locks[fqbn_slug] = lock
        return lock


def _read_b64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def _sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _compile_sketch(sketch: str, fqbn: str) -> dict:
    fqbn_slug = _slugify(fqbn)
    core_version = _core_version_cached()

    # Result-cache key: identical sketch+fqbn+core => instant return.
    sketch_hash = hashlib.sha256(
        f"{core_version}|{fqbn}|{sketch}".encode("utf-8")
    ).hexdigest()
    results_dir = Path(CACHE_MOUNT) / "results"
    results_dir.mkdir(parents=True, exist_ok=True)
    cached_path = results_dir / f"{sketch_hash}.json"
    if cached_path.exists():
        try:
            with open(cached_path, "r") as f:
                payload = json.load(f)
            # Refuse to serve a cached entry that's missing both binaries —
            # that's a stale entry from a previous broken compile. Drop it
            # and recompile.
            if payload.get("binary") or payload.get("app_binary"):
                payload["cache_hit"] = True
                payload["stdout"] = (payload.get("stdout") or "") + "\n[diag] result_cache=HIT"
                return payload
            try:
                cached_path.unlink()
            except Exception:
                pass
        except Exception:
            try:
                cached_path.unlink()
            except Exception:
                pass

    _seed_cache_from_prewarm()

    # Workspace AND build dir are stable per-fqbn on /tmp. Stable paths are
    # what let arduino-cli do incremental rebuilds — library .o files
    # (Adafruit_GFX, SSD1306, ADXL345, etc.) persist between calls and only
    # the changed sketch.ino + final link run on subsequent compiles.
    # `--build-cache-path` only caches the core (core.a); library caching
    # depends entirely on build_dir reuse. /tmp is per-container so this
    # cache evaporates on cold start, which is fine — that's what the Volume
    # result-cache is for.
    workspace = Path("/tmp/esp32-ws") / fqbn_slug / "sketch"
    workspace.mkdir(parents=True, exist_ok=True)
    ino_path = workspace / "sketch.ino"

    build_dir = Path("/tmp/esp32-build") / fqbn_slug
    build_dir.mkdir(parents=True, exist_ok=True)

    arduino_cache = Path(CACHE_MOUNT) / "arduino-cache"
    arduino_cache.mkdir(parents=True, exist_ok=True)

    build_fqbn = f"{fqbn}:FlashMode=dio"
    fqbn_lock = _lock_for(fqbn_slug)
    with fqbn_lock:
        with open(ino_path, "w") as f:
            f.write(sketch)

        compile_started = time.monotonic()
        result = subprocess.run(
            [
                "arduino-cli", "compile",
                "--fqbn", build_fqbn,
                "--build-cache-path", str(arduino_cache),
                "--build-path", str(build_dir),
                "--warnings", "default",
                str(workspace),
            ],
            capture_output=True,
            text=True,
        )
        compile_secs = time.monotonic() - compile_started

        diag_cache = (
            _diag_cache_stats(result.stdout) +
            f"\n[diag] arduino-cli compile took {compile_secs:.1f}s"
        )

        def _list_build_dir() -> str:
            try:
                return "\n".join(sorted(os.listdir(build_dir)))
            except Exception as exc:
                return f"(listing failed: {exc})"

        if result.returncode != 0:
            return {
                "ok": False,
                "error": "compile_failed",
                "stdout": result.stdout + diag_cache,
                "stderr": result.stderr,
            }

        merged_path = build_dir / "sketch.ino.merged.bin"
        app_path = build_dir / "sketch.ino.bin"
        partitions_path = build_dir / "sketch.ino.partitions.bin"

        def _has_content(p: Path) -> bool:
            try:
                return p.exists() and p.stat().st_size > 0
            except Exception:
                return False

        merged_ok = _has_content(merged_path)
        app_ok = _has_content(app_path)

        if not merged_ok and not app_ok:
            return {
                "ok": False,
                "error": "no_binary_produced",
                "stdout": (
                    result.stdout + diag_cache +
                    f"\n[diag] build_dir contents:\n{_list_build_dir()}"
                ),
                "stderr": result.stderr,
            }

        header_info = ""
        if merged_ok:
            data = merged_path.read_bytes()
            if len(data) >= 4 and data[0] == 0xE9:
                mode_names = {0: "QIO", 1: "QOUT", 2: "DIO", 3: "DOUT"}
                header_info = (
                    f"\n[diag] merged.bin size={len(data)} "
                    f"header: magic=0xE9 "
                    f"spi_mode=0x{data[2]:02x} ({mode_names.get(data[2], '?')}) "
                    f"spi_size_freq=0x{data[3]:02x}"
                )

        payload = {
            "ok": True,
            "flash_offset": 0x0,
            "binary": _read_b64(str(merged_path)) if merged_ok else None,
            "app_offset": 0x10000,
            "app_binary": _read_b64(str(app_path)) if app_ok else None,
            "partitions_hash": _sha256_file(str(partitions_path)) if _has_content(partitions_path) else None,
            "core_version": core_version,
            "cache_hit": False,
            "stdout": (
                result.stdout + diag_cache + header_info +
                f"\n[diag] build_dir contents:\n{_list_build_dir()}"
            ),
            "stderr": result.stderr,
        }

        # Persist to result cache, then commit so other containers see it.
        # Only cache if at least one binary is present — never cache a broken
        # response, otherwise students get an instant "no binary" forever.
        if payload["binary"] or payload["app_binary"]:
            try:
                tmp = cached_path.with_suffix(".json.tmp")
                with open(tmp, "w") as f:
                    json.dump(payload, f)
                os.replace(tmp, cached_path)
                build_cache_vol.commit()
            except Exception:
                logger.exception("failed to persist result cache entry")

        return payload


@app.function(
    image=image,
    timeout=300,
    cpu=8.0,
    scaledown_window=600,
    volumes={CACHE_MOUNT: build_cache_vol},
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

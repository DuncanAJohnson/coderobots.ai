"""
Modal serverless function for analyzing SPIKE PRIME code and determining port configuration.
No budget tracking - uses gpt-5-nano for fast, cheap analysis.
"""

import modal
import json
import os
from typing import AsyncIterator

# Create Modal app
app = modal.App("coderobots-port-config")

# Define the image with dependencies
image = modal.Image.debian_slim().pip_install(
    "openai",
    "fastapi[standard]"
)


@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("openai-api-key"),
    ],
    timeout=60,  # 1 minute timeout
)
async def analyze_port_configuration(
    code: str,
    model: str = "gpt-5-nano",
) -> str:
    """
    Analyze SPIKE PRIME Python code and return port configuration.
    
    Args:
        code: Python code to analyze
        model: OpenAI model to use (default: gpt-5-nano)
    
    Returns:
        JSON string with port configuration
    """
    from openai import AsyncOpenAI
    
    # Initialize OpenAI client
    openai_client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

    print(f"Analyzing code: {code}")
    
    # System prompt for port configuration analysis
    system_prompt = """You are an expert at analyzing SPIKE PRIME Python code to determine which sensors and motors are connected to which ports.

Your task is to analyze the provided Python code and identify which component is connected to each port (A, B, C, D, E, F) on the SPIKE PRIME hub.

Component types:
- "motor" - any motor (Motor, MotorPair, etc.)
- "color_sensor" - ColorSensor
- "distance_sensor" - DistanceSensor
- "force_sensor" - ForceSensor
- "none" - no component connected to that port

Look for patterns like:
- Motor(Port.A) -> port A has a motor
- ColorSensor(Port.B) -> port B has a color_sensor
- DistanceSensor(Port.C) -> port C has a distance_sensor
- ForceSensor(Port.D) -> port D has a force_sensor
- MotorPair(Port.A, Port.B) -> ports A and B have motors

Important rules:
1. Only identify components that are explicitly created in the code
2. If a port is not mentioned, use "none"
3. Return ONLY valid JSON, no explanations or additional text
4. All port keys (a, b, c, d, e, f) must be lowercase
5. All component values must be one of: "motor", "color_sensor", "distance_sensor", "force_sensor", "none"

Example output format:
{
  "a": "motor",
  "b": "motor",
  "c": "color_sensor",
  "d": "distance_sensor",
  "e": "force_sensor",
  "f": "none"
}

Now analyze the code and return the port configuration as JSON only."""
    
    try:
        # Build request for new Responses API
        input_messages = [
            {
                "type": "message",
                "role": "user",
                "content": f"Analyze this SPIKE PRIME code and return the port configuration as JSON:\n\n```python\n{code}\n```"
            }
        ]
        
        # Call OpenAI with new Responses API (non-streaming for simplicity)
        response = await openai_client.responses.create(
            model=model,
            instructions=system_prompt,
            input=input_messages,
            max_output_tokens=500,
            stream=False,
            text={
                "format": {
                    "type": "json_object"
                }
            }
        )
        
        # Extract the response text
        result_text = ""
        if hasattr(response, 'output') and response.output:
            for item in response.output:
                if hasattr(item, 'content') and item.content:
                    for content_item in item.content:
                        if hasattr(content_item, 'text'):
                            result_text += content_item.text
        
        # Parse and validate the JSON
        port_config = json.loads(result_text)
        
        # Validate that all required ports are present
        required_ports = ['a', 'b', 'c', 'd', 'e', 'f']
        for port in required_ports:
            if port not in port_config:
                port_config[port] = 'none'
        
        # Validate component types
        valid_components = {'motor', 'color_sensor', 'distance_sensor', 'force_sensor', 'none'}
        for port, component in port_config.items():
            if component not in valid_components:
                port_config[port] = 'none'
        
        return json.dumps(port_config)
        
    except Exception as e:
        print(f"Error analyzing port configuration: {str(e)}")
        # Return default configuration on error
        return json.dumps({
            "a": "none",
            "b": "none",
            "c": "none",
            "d": "none",
            "e": "none",
            "f": "none"
        })


@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("openai-api-key"),
    ],
)
@modal.fastapi_endpoint(method="POST")
async def port_config_endpoint(request: dict):
    """
    HTTP endpoint for port configuration analysis.
    
    Expected payload:
    {
        "code": "python code string",
        "model": "gpt-5-nano"  (optional)
    }
    """
    code = request.get("code", "")
    model = request.get("model", "gpt-5-nano")
    
    if not code:
        return {"error": "No code provided"}, 400
    
    result = analyze_port_configuration.remote(code=code, model=model)
    
    return {
        "port_config": json.loads(result)
    }


from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
import vertexai
from vertexai.preview import reasoning_engines
from google.cloud.aiplatform_v1beta1 import types as aip_types
import os

app = FastAPI(title="Agent Engine Query API")

# Configuration
PROJECT_ID = "navbeai"
LOCATION = "us-central1"
# The Reasoning Engine ID extracted from your operation details
REASONING_ENGINE_ID = "projects/363304624491/locations/us-central1/reasoningEngines/3271432471459135488"

# Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location=LOCATION)

# Connect to the deployed Agent
try:
    remote_agent = reasoning_engines.ReasoningEngine(REASONING_ENGINE_ID)
except Exception as e:
    print(f"Error initializing Reasoning Engine: {e}")
    remote_agent = None

class QueryRequest(BaseModel):
    prompt: str
    user_id: str = "default-user"

@app.post("/query")
async def query_agent(request: QueryRequest):
    if not remote_agent:
        raise HTTPException(status_code=500, detail="Agent Engine is not initialized. Check your credentials and permissions.")

    try:
        # remote_agent.stream_query is unavailable: the SDK's dynamic method
        # registration aborts on this engine's `async` schemas (SDK bug), so we
        # call the underlying API directly instead.
        response = remote_agent.execution_api_client.stream_query_reasoning_engine(
            request=aip_types.StreamQueryReasoningEngineRequest(
                name=remote_agent.resource_name,
                input={"message": request.prompt, "user_id": request.user_id},
                class_method="stream_query",
            ),
        )
        events = [json.loads(chunk.data.decode("utf-8")) for chunk in response if chunk.data]
        return {"response": events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "agent_connected": remote_agent is not None}

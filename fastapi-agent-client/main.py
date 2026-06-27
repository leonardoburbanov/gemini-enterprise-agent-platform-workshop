from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import vertexai
from vertexai.preview import reasoning_engines
from google.cloud.aiplatform_v1beta1 import types as aip_types
import os

app = FastAPI(title="Agent Engine Query API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])

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

def _extract_text(event: dict) -> str:
    # ponytail: only handles content.parts[].text — widen if agent emits text elsewhere
    parts = event.get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in parts if isinstance(p, dict))

@app.post("/query/stream")
async def query_agent_stream(request: QueryRequest):
    if not remote_agent:
        raise HTTPException(status_code=500, detail="Agent Engine is not initialized.")

    def generate():
        try:
            response = remote_agent.execution_api_client.stream_query_reasoning_engine(
                request=aip_types.StreamQueryReasoningEngineRequest(
                    name=remote_agent.resource_name,
                    input={"message": request.prompt, "user_id": request.user_id},
                    class_method="stream_query",
                ),
            )
            for chunk in response:
                if not chunk.data:
                    continue
                event = json.loads(chunk.data.decode("utf-8"))
                text = _extract_text(event)
                if text:
                    yield f"0:{json.dumps(text)}\n"
            yield 'd:{"finishReason":"stop"}\n'
        except Exception as e:
            yield f"3:{json.dumps(str(e))}\n"

    return StreamingResponse(
        generate(),
        media_type="text/plain; charset=utf-8",
        headers={"X-Vercel-AI-Data-Stream": "v1"},
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "agent_connected": remote_agent is not None}

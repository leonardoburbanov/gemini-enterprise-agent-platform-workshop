from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import base64
import json
import sqlite3
import time
import vertexai
from vertexai.preview import reasoning_engines
from google.cloud.aiplatform_v1beta1 import types as aip_types

app = FastAPI(title="Agent Engine Query API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])

# Configuration
PROJECT_ID = "navbeai"
LOCATION = "us-central1"
REASONING_ENGINE_ID = "projects/363304624491/locations/us-central1/reasoningEngines/3271432471459135488"

vertexai.init(project=PROJECT_ID, location=LOCATION)

try:
    remote_agent = reasoning_engines.ReasoningEngine(REASONING_ENGINE_ID)
except Exception as e:
    print(f"Error initializing Reasoning Engine: {e}")
    remote_agent = None

# --- SQLite session persistence ---
DB_PATH = "sessions.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT 'New Chat',
                messages TEXT NOT NULL DEFAULT '[]',
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            )
        """)

init_db()

# --- Session endpoints ---
class SessionCreate(BaseModel):
    id: str
    user_id: str = "default-user"
    title: str = "New Chat"
    messages: list = []

class SessionUpdate(BaseModel):
    title: str | None = None
    messages: list | None = None

@app.get("/sessions")
async def list_sessions(user_id: str = "default-user"):
    with get_db() as db:
        rows = db.execute(
            "SELECT id, title, messages FROM sessions WHERE user_id=? ORDER BY updated_at DESC",
            (user_id,)
        ).fetchall()
    return [{"id": r["id"], "title": r["title"], "messages": json.loads(r["messages"])} for r in rows]

@app.post("/sessions", status_code=201)
async def create_session(body: SessionCreate):
    now = time.time()
    with get_db() as db:
        db.execute(
            "INSERT OR IGNORE INTO sessions (id, user_id, title, messages, created_at, updated_at) VALUES (?,?,?,?,?,?)",
            (body.id, body.user_id, body.title, json.dumps(body.messages), now, now)
        )
    return {"id": body.id}

@app.put("/sessions/{session_id}")
async def update_session(session_id: str, body: SessionUpdate):
    now = time.time()
    with get_db() as db:
        row = db.execute("SELECT id FROM sessions WHERE id=?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        if body.title is not None and body.messages is not None:
            db.execute("UPDATE sessions SET title=?, messages=?, updated_at=? WHERE id=?",
                       (body.title, json.dumps(body.messages), now, session_id))
        elif body.title is not None:
            db.execute("UPDATE sessions SET title=?, updated_at=? WHERE id=?", (body.title, now, session_id))
        elif body.messages is not None:
            db.execute("UPDATE sessions SET messages=?, updated_at=? WHERE id=?",
                       (json.dumps(body.messages), now, session_id))
    return {"id": session_id}

@app.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str):
    with get_db() as db:
        db.execute("DELETE FROM sessions WHERE id=?", (session_id,))

# --- Query endpoints ---
class Attachment(BaseModel):
    name: str = "file"
    mime_type: str = "application/octet-stream"
    data: str  # base64

class QueryRequest(BaseModel):
    prompt: str
    user_id: str = "default-user"
    session_id: str = "default-session"
    attachments: list[Attachment] = []

def _build_message(request: QueryRequest) -> str:
    """Combine prompt + attachments into a single text message for the reasoning engine."""
    parts = [request.prompt] if request.prompt else []
    for att in request.attachments:
        if att.mime_type.startswith("image/"):
            parts.append(f"[image:{att.name} base64={att.data}]")
        else:
            try:
                text = base64.b64decode(att.data).decode("utf-8", errors="replace")
                parts.append(f"[file:{att.name}]\n{text}")
            except Exception:
                parts.append(f"[file:{att.name} base64={att.data}]")
    return "\n\n".join(parts)

@app.post("/query/stream")
async def query_agent_stream(request: QueryRequest):
    if not remote_agent:
        raise HTTPException(status_code=500, detail="Agent Engine is not initialized.")

    def generate():
        try:
            message = _build_message(request)
            # ponytail: Agent Runtime owns sessions — local SQLite ids are not valid there
            agent_input = {"message": message, "user_id": request.user_id}
            response = remote_agent.execution_api_client.stream_query_reasoning_engine(
                request=aip_types.StreamQueryReasoningEngineRequest(
                    name=remote_agent.resource_name,
                    input=agent_input,
                    class_method="async_stream_query",
                ),
            )
            for chunk in response:
                if not chunk.data:
                    continue
                event = json.loads(chunk.data.decode("utf-8"))
                yield json.dumps(event) + "\n"
                if event.get("code", 0) >= 400:
                    break
        except Exception as e:
            yield json.dumps({"__error": str(e)}) + "\n"

    return StreamingResponse(
        generate(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "agent_connected": remote_agent is not None}

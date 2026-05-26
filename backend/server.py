from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import asyncio
import requests


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="NEO Imatrix Console")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


DEFAULT_MODEL_ID = "darealmelo/OpenAi-GPT-oss-20b-abliterated-uncensored-NEO-Imatrix-gguf:Q5_1"
DEFAULT_MODEL_COMMAND = f"llama-server -hf {DEFAULT_MODEL_ID}"
SETTINGS_KEY = "llama_connection"

PERSONAS = [
    {
        "id": "neo-core",
        "name": "NEO Core",
        "tagline": "Direct general assistant",
        "system_prompt": "You are NEO Core, a concise and technically capable AI assistant. Answer clearly and avoid inventing facts.",
    },
    {
        "id": "red-team-analyst",
        "name": "Red-Team Analyst",
        "tagline": "Security-minded reasoning",
        "system_prompt": "You are a security analysis assistant focused on defensive review, risk explanation, and responsible remediation guidance.",
    },
    {
        "id": "code-operator",
        "name": "Code Operator",
        "tagline": "Implementation and debugging",
        "system_prompt": "You are a senior software engineering assistant. Provide practical, tested, minimal code and explain tradeoffs briefly.",
    },
    {
        "id": "creative-signal",
        "name": "Creative Signal",
        "tagline": "Ideation and writing",
        "system_prompt": "You are a vivid creative partner. Generate original ideas, strong structure, and polished language while respecting the user's intent.",
    },
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def persona_by_id(persona_id: str) -> Dict[str, str]:
    return next((persona for persona in PERSONAS if persona["id"] == persona_id), PERSONAS[0])


def normalize_endpoint(endpoint_url: str) -> str:
    return endpoint_url.strip().rstrip("/")


def chat_completions_url(endpoint_url: str) -> str:
    base = normalize_endpoint(endpoint_url)
    if base.endswith("/v1/chat/completions"):
        return base
    if base.endswith("/v1"):
        return f"{base}/chat/completions"
    return f"{base}/v1/chat/completions"


def models_url(endpoint_url: str) -> str:
    base = normalize_endpoint(endpoint_url)
    if base.endswith("/v1/chat/completions"):
        return base.replace("/chat/completions", "/models")
    if base.endswith("/v1"):
        return f"{base}/models"
    return f"{base}/v1/models"


def request_headers(api_key: Optional[str] = None) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


async def post_json(url: str, payload: Dict[str, Any], api_key: Optional[str], timeout: int = 90) -> Dict[str, Any]:
    def _call():
        response = requests.post(url, json=payload, headers=request_headers(api_key), timeout=timeout)
        response.raise_for_status()
        return response.json()

    try:
        return await asyncio.to_thread(_call)
    except requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"llama-server request failed: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="llama-server returned a non-JSON response") from exc


async def get_json(url: str, api_key: Optional[str], timeout: int = 12) -> Dict[str, Any]:
    def _call():
        response = requests.get(url, headers=request_headers(api_key), timeout=timeout)
        response.raise_for_status()
        return response.json()

    try:
        return await asyncio.to_thread(_call)
    except requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"connection test failed: {exc}") from exc
    except ValueError:
        return {"status": "reachable"}


class Persona(BaseModel):
    id: str
    name: str
    tagline: str
    system_prompt: str


class ConnectionSettings(BaseModel):
    endpoint_url: Optional[str] = None
    model_id: str = DEFAULT_MODEL_ID
    model_command: str = DEFAULT_MODEL_COMMAND
    updated_at: Optional[str] = None


class ConnectionSettingsUpdate(BaseModel):
    endpoint_url: str = Field(..., min_length=7)


class ConnectionTestRequest(BaseModel):
    endpoint_url: str = Field(..., min_length=7)
    api_key: Optional[str] = None


class ConnectionTestResponse(BaseModel):
    ok: bool
    endpoint_url: str
    message: str
    models: List[str] = Field(default_factory=list)


class ConversationCreate(BaseModel):
    title: Optional[str] = None
    persona_id: str = "neo-core"


class ConversationSummary(BaseModel):
    id: str
    title: str
    persona_id: str
    message_count: int = 0
    last_message_preview: str = ""
    created_at: str
    updated_at: str


class Message(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: str


class ConversationDetail(ConversationSummary):
    messages: List[Message] = Field(default_factory=list)


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str = Field(..., min_length=1)
    persona_id: str = "neo-core"
    endpoint_url: Optional[str] = None
    api_key: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=768, ge=32, le=4096)


class ChatResponse(BaseModel):
    conversation_id: str
    user_message: Message
    assistant_message: Message
    model_id: str


@api_router.get("/")
async def root():
    return {"message": "NEO Imatrix Console API online", "model_id": DEFAULT_MODEL_ID}


@api_router.get("/personas", response_model=List[Persona])
async def list_personas():
    return PERSONAS


async def get_connection_settings() -> ConnectionSettings:
    settings = await db.settings.find_one({"key": SETTINGS_KEY}, {"_id": 0})
    if not settings:
        return ConnectionSettings()
    return ConnectionSettings(
        endpoint_url=settings.get("endpoint_url"),
        model_id=DEFAULT_MODEL_ID,
        model_command=DEFAULT_MODEL_COMMAND,
        updated_at=settings.get("updated_at"),
    )


@api_router.get("/settings", response_model=ConnectionSettings)
async def read_settings():
    return await get_connection_settings()


@api_router.put("/settings", response_model=ConnectionSettings)
async def update_settings(input: ConnectionSettingsUpdate):
    endpoint_url = normalize_endpoint(input.endpoint_url)
    updated_at = utc_now_iso()
    await db.settings.update_one(
        {"key": SETTINGS_KEY},
        {"$set": {"key": SETTINGS_KEY, "endpoint_url": endpoint_url, "updated_at": updated_at}},
        upsert=True,
    )
    return ConnectionSettings(endpoint_url=endpoint_url, updated_at=updated_at)


@api_router.post("/connection/test", response_model=ConnectionTestResponse)
async def test_connection(input: ConnectionTestRequest):
    endpoint_url = normalize_endpoint(input.endpoint_url)
    try:
        payload = await get_json(models_url(endpoint_url), input.api_key)
        models = []
        if isinstance(payload.get("data"), list):
            models = [str(item.get("id", "unknown")) for item in payload["data"][:8] if isinstance(item, dict)]
        return ConnectionTestResponse(
            ok=True,
            endpoint_url=endpoint_url,
            message="llama-server OpenAI-compatible route is reachable",
            models=models,
        )
    except HTTPException as exc:
        return ConnectionTestResponse(ok=False, endpoint_url=endpoint_url, message=str(exc.detail), models=[])


@api_router.post("/conversations", response_model=ConversationSummary)
async def create_conversation(input: ConversationCreate):
    persona = persona_by_id(input.persona_id)
    now = utc_now_iso()
    conversation = {
        "id": str(uuid.uuid4()),
        "title": input.title or f"{persona['name']} session",
        "persona_id": persona["id"],
        "message_count": 0,
        "last_message_preview": "Awaiting signal",
        "created_at": now,
        "updated_at": now,
    }
    await db.conversations.insert_one(conversation)
    return ConversationSummary(**conversation)


@api_router.get("/conversations", response_model=List[ConversationSummary])
async def list_conversations():
    conversations = await db.conversations.find({}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return [ConversationSummary(**conversation) for conversation in conversations]


@api_router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(conversation_id: str):
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="conversation not found")
    messages = await db.messages.find({"conversation_id": conversation_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return ConversationDetail(**conversation, messages=[Message(**message) for message in messages])


@api_router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    await db.messages.delete_many({"conversation_id": conversation_id})
    result = await db.conversations.delete_one({"id": conversation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="conversation not found")
    return {"deleted": True, "conversation_id": conversation_id}


async def ensure_conversation(conversation_id: Optional[str], persona_id: str, first_message: str) -> Dict[str, Any]:
    if conversation_id:
        conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
        if not conversation:
            raise HTTPException(status_code=404, detail="conversation not found")
        return conversation

    title = first_message.strip().replace("\n", " ")[:54] or "New signal"
    summary = await create_conversation(ConversationCreate(title=title, persona_id=persona_id))
    return summary.model_dump()


def extract_assistant_text(payload: Dict[str, Any]) -> str:
    choices = payload.get("choices")
    if not choices:
        raise HTTPException(status_code=502, detail="llama-server response did not include choices")
    first = choices[0]
    message = first.get("message", {}) if isinstance(first, dict) else {}
    content = message.get("content") or first.get("text")
    if isinstance(content, list):
        content = "\n".join(str(part.get("text", part)) for part in content)
    if not content:
        raise HTTPException(status_code=502, detail="llama-server returned an empty assistant message")
    return str(content).strip()


@api_router.post("/chat", response_model=ChatResponse)
async def chat(input: ChatRequest):
    settings = await get_connection_settings()
    endpoint_url = normalize_endpoint(input.endpoint_url or settings.endpoint_url or "")
    if not endpoint_url:
        raise HTTPException(status_code=400, detail="Configure a llama-server endpoint before sending messages")

    clean_message = input.message.strip()
    conversation = await ensure_conversation(input.conversation_id, input.persona_id, clean_message)
    conversation_id = conversation["id"]
    persona = persona_by_id(conversation.get("persona_id", input.persona_id))
    now = utc_now_iso()
    user_message = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "role": "user",
        "content": clean_message,
        "created_at": now,
    }
    await db.messages.insert_one(user_message)

    history = await db.messages.find({"conversation_id": conversation_id}, {"_id": 0}).sort("created_at", 1).to_list(40)
    openai_messages = [{"role": "system", "content": persona["system_prompt"]}]
    openai_messages.extend({"role": message["role"], "content": message["content"]} for message in history if message["role"] in {"user", "assistant"})
    payload = {
        "model": DEFAULT_MODEL_ID,
        "messages": openai_messages,
        "temperature": input.temperature,
        "max_tokens": input.max_tokens,
        "stream": False,
    }
    response_payload = await post_json(chat_completions_url(endpoint_url), payload, input.api_key)
    assistant_text = extract_assistant_text(response_payload)
    assistant_message = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": assistant_text,
        "created_at": utc_now_iso(),
    }
    await db.messages.insert_one(assistant_message)
    message_count = await db.messages.count_documents({"conversation_id": conversation_id})
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"updated_at": utc_now_iso(), "message_count": message_count, "last_message_preview": assistant_text[:120]}},
    )
    return ChatResponse(
        conversation_id=conversation_id,
        user_message=Message(**user_message),
        assistant_message=Message(**assistant_message),
        model_id=DEFAULT_MODEL_ID,
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
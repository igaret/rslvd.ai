"""Regression tests for NEO Imatrix Console backend API routes and core workflows."""

import os
import uuid

import pytest
import requests


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")


@pytest.fixture(scope="session")
def api_base_url():
    assert BASE_URL, "REACT_APP_BACKEND_URL must be set in environment"
    return BASE_URL.rstrip("/")


@pytest.fixture
def api_client():
    """Shared HTTP client for API tests."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def test_conversation_ids():
    """Collect test-created conversation IDs for cleanup."""
    return []


@pytest.fixture(autouse=True)
def cleanup_test_data(api_client, api_base_url, test_conversation_ids):
    """Cleanup: remove TEST_ conversations created in each test."""
    yield
    for conversation_id in test_conversation_ids:
        api_client.delete(f"{api_base_url}/api/conversations/{conversation_id}")


# Module: health/root + personas + settings + connection test
def test_root_endpoint(api_client, api_base_url):
    response = api_client.get(f"{api_base_url}/api/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "NEO Imatrix Console API online"
    assert isinstance(data["model_id"], str)


def test_personas_endpoint(api_client, api_base_url):
    response = api_client.get(f"{api_base_url}/api/personas")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert {"id", "name", "tagline", "system_prompt"}.issubset(set(data[0].keys()))


def test_settings_save_and_read(api_client, api_base_url):
    endpoint_url = f"http://127.0.0.1:{8000 + (uuid.uuid4().int % 1000)}"
    put_response = api_client.put(
        f"{api_base_url}/api/settings",
        json={"endpoint_url": endpoint_url},
    )
    assert put_response.status_code == 200
    put_data = put_response.json()
    assert put_data["endpoint_url"] == endpoint_url
    assert isinstance(put_data["updated_at"], str)

    get_response = api_client.get(f"{api_base_url}/api/settings")
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert get_data["endpoint_url"] == endpoint_url
    assert isinstance(get_data["model_id"], str)
    assert isinstance(get_data["model_command"], str)


def test_connection_test_offline_response(api_client, api_base_url):
    offline_url = "http://127.0.0.1:9"
    response = api_client.post(
        f"{api_base_url}/api/connection/test",
        json={"endpoint_url": offline_url},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is False
    assert data["endpoint_url"] == offline_url
    assert "failed" in data["message"].lower() or "error" in data["message"].lower()


# Module: conversations CRUD + persistence checks
def test_conversation_crud_persistence(api_client, api_base_url, test_conversation_ids):
    create_payload = {"title": f"TEST_convo_{uuid.uuid4().hex[:8]}", "persona_id": "neo-core"}
    create_response = api_client.post(f"{api_base_url}/api/conversations", json=create_payload)
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["title"] == create_payload["title"]
    assert created["persona_id"] == create_payload["persona_id"]
    assert created["message_count"] == 0
    conversation_id = created["id"]
    test_conversation_ids.append(conversation_id)

    list_response = api_client.get(f"{api_base_url}/api/conversations")
    assert list_response.status_code == 200
    rows = list_response.json()
    matched = [row for row in rows if row["id"] == conversation_id]
    assert len(matched) == 1
    assert matched[0]["title"] == create_payload["title"]

    get_response = api_client.get(f"{api_base_url}/api/conversations/{conversation_id}")
    assert get_response.status_code == 200
    detail = get_response.json()
    assert detail["id"] == conversation_id
    assert detail["messages"] == []

    delete_response = api_client.delete(f"{api_base_url}/api/conversations/{conversation_id}")
    assert delete_response.status_code == 200
    deleted = delete_response.json()
    assert deleted["deleted"] is True
    test_conversation_ids.remove(conversation_id)

    get_deleted_response = api_client.get(f"{api_base_url}/api/conversations/{conversation_id}")
    assert get_deleted_response.status_code == 404
    assert "not found" in get_deleted_response.json()["detail"].lower()


# Module: chat guard and no-fake-output behavior when endpoint is unreachable
def test_chat_returns_explicit_error_when_endpoint_unreachable(api_client, api_base_url, test_conversation_ids):
    create_payload = {"title": f"TEST_chat_{uuid.uuid4().hex[:8]}", "persona_id": "neo-core"}
    create_response = api_client.post(f"{api_base_url}/api/conversations", json=create_payload)
    assert create_response.status_code == 200
    conversation_id = create_response.json()["id"]
    test_conversation_ids.append(conversation_id)

    chat_response = api_client.post(
        f"{api_base_url}/api/chat",
        json={
            "conversation_id": conversation_id,
            "message": "TEST ping",
            "persona_id": "neo-core",
            "endpoint_url": "http://127.0.0.1:9",
        },
    )
    assert chat_response.status_code == 502
    data = chat_response.json()
    assert "detail" in data
    assert "failed" in data["detail"].lower() or "error" in data["detail"].lower()


def test_chat_missing_endpoint_guard(api_client, api_base_url):
    settings_response = api_client.get(f"{api_base_url}/api/settings")
    assert settings_response.status_code == 200
    endpoint = (settings_response.json() or {}).get("endpoint_url")
    if endpoint:
        pytest.skip("Endpoint already configured in persisted settings; missing-endpoint guard cannot be deterministically asserted.")

    chat_response = api_client.post(
        f"{api_base_url}/api/chat",
        json={"message": "hello", "persona_id": "neo-core"},
    )
    assert chat_response.status_code == 400
    detail = chat_response.json()["detail"]
    assert "endpoint" in detail.lower()

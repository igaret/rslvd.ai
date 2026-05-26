import { useCallback, useEffect, useMemo, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { CommandSidebar } from "@/components/console/CommandSidebar";
import ChatPage from "@/pages/ChatPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import {
  createConversation,
  deleteConversation,
  getConversation,
  getPersonas,
  getSettings,
  listConversations,
  saveSettings,
  sendChat,
  testConnection,
} from "@/api/client";

function ConsoleApp() {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState([]);
  const [settings, setSettings] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState("neo-core");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [connectionResult, setConnectionResult] = useState(null);

  const refreshConversations = useCallback(async () => {
    const rows = await listConversations();
    setConversations(rows);
    return rows;
  }, []);

  const loadConversation = useCallback(async (id) => {
    if (!id) return;
    const detail = await getConversation(id);
    setActiveConversationId(detail.id);
    setMessages(detail.messages || []);
    setSelectedPersona(detail.persona_id || "neo-core");
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        const [personaRows, storedSettings, conversationRows] = await Promise.all([
          getPersonas(),
          getSettings(),
          listConversations(),
        ]);
        setPersonas(personaRows);
        setSettings(storedSettings);
        setConversations(conversationRows);
        if (conversationRows[0]?.id) {
          await loadConversation(conversationRows[0].id);
        }
      } catch (caught) {
        setError(caught.message || "Console boot failed");
      } finally {
        setBooting(false);
      }
    };
    boot();
  }, [loadConversation]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId),
    [activeConversationId, conversations]
  );

  const handleNewConversation = async () => {
    setError("");
    const row = await createConversation({ persona_id: selectedPersona });
    await refreshConversations();
    setActiveConversationId(row.id);
    setMessages([]);
    navigate("/");
  };

  const handleSelectConversation = async (id) => {
    setError("");
    await loadConversation(id);
    navigate("/");
  };

  const handleDeleteConversation = async (id) => {
    setError("");
    await deleteConversation(id);
    const rows = await refreshConversations();
    if (id === activeConversationId) {
      if (rows[0]?.id) {
        await loadConversation(rows[0].id);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    }
  };

  const handleSendMessage = async ({ message, temperature, maxTokens, apiKey }) => {
    setError("");
    setLoading(true);
    const optimisticUser = {
      id: `local-${Date.now()}`,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimisticUser]);
    try {
      const response = await sendChat({
        conversation_id: activeConversationId,
        persona_id: selectedPersona,
        message,
        endpoint_url: settings?.endpoint_url,
        temperature,
        max_tokens: maxTokens,
        api_key: apiKey || undefined,
      });
      setActiveConversationId(response.conversation_id);
      setMessages((current) => [
        ...current.filter((item) => item.id !== optimisticUser.id),
        response.user_message,
        response.assistant_message,
      ]);
      await refreshConversations();
    } catch (caught) {
      setMessages((current) => current.filter((item) => item.id !== optimisticUser.id));
      setError(caught.message || "Message transmission failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (endpointUrl) => {
    setError("");
    const updated = await saveSettings(endpointUrl);
    setSettings(updated);
    return updated;
  };

  const handleTestConnection = async (endpointUrl, apiKey) => {
    setError("");
    const result = await testConnection(endpointUrl, apiKey);
    setConnectionResult(result);
    return result;
  };

  return (
    <div className="min-h-screen console-shell" data-testid="console-app-shell">
      <div className="scanlines" aria-hidden="true" />
      <div className="noise-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1800px] grid-cols-1 xl:grid-cols-[320px_1fr]">
        <CommandSidebar
          booting={booting}
          conversations={conversations}
          activeConversationId={activeConversationId}
          settings={settings}
          onNewConversation={handleNewConversation}
          onSelectConversation={handleSelectConversation}
        />
        <main className="min-w-0 border-l border-[#00ff41]/30" data-testid="main-console-panel">
          <Routes>
            <Route
              path="/"
              element={
                <ChatPage
                  personas={personas}
                  settings={settings}
                  activeConversation={activeConversation}
                  messages={messages}
                  selectedPersona={selectedPersona}
                  setSelectedPersona={setSelectedPersona}
                  loading={loading}
                  booting={booting}
                  error={error}
                  onSendMessage={handleSendMessage}
                  onNewConversation={handleNewConversation}
                />
              }
            />
            <Route
              path="/history"
              element={
                <HistoryPage
                  conversations={conversations}
                  onSelectConversation={handleSelectConversation}
                  onDeleteConversation={handleDeleteConversation}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  settings={settings}
                  connectionResult={connectionResult}
                  onSaveSettings={handleSaveSettings}
                  onTestConnection={handleTestConnection}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ConsoleApp />
    </BrowserRouter>
  );
}

export default App;

import { Link, useLocation } from "react-router-dom";
import { Bot, History, MessageSquarePlus, RadioTower, Settings, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/", label: "CHAT", icon: Terminal, testid: "sidebar-chat-link" },
  { path: "/history", label: "HISTORY", icon: History, testid: "sidebar-history-link" },
  { path: "/settings", label: "ENDPOINT", icon: Settings, testid: "sidebar-settings-link" },
];

export const CommandSidebar = ({
  booting,
  conversations,
  activeConversationId,
  settings,
  onNewConversation,
  onSelectConversation,
}) => {
  const location = useLocation();
  const endpointOnline = Boolean(settings?.endpoint_url);

  return (
    <aside className="sidebar-panel" data-testid="command-sidebar">
      <div className="brand-lockup" data-testid="brand-lockup">
        <div className="brand-glyph" data-testid="brand-glyph"><Bot size={26} /></div>
        <div>
          <p className="eyebrow" data-testid="brand-eyebrow">LLAMA SERVER UI</p>
          <h1 data-testid="brand-title">NEO IMATRIX</h1>
        </div>
      </div>

      <div className="status-stack" data-testid="sidebar-status-stack">
        <div className="status-row" data-testid="boot-status-row">
          <span>BOOT</span>
          <strong data-testid="boot-status-value">{booting ? "SYNC" : "READY"}</strong>
        </div>
        <div className="status-row" data-testid="endpoint-status-row">
          <span>ENDPOINT</span>
          <strong data-testid="endpoint-status-value">{endpointOnline ? "SET" : "MISSING"}</strong>
        </div>
        <div className="status-row" data-testid="memory-status-row">
          <span>MEMORY</span>
          <strong data-testid="memory-status-value">{conversations.length} LOGS</strong>
        </div>
      </div>

      <Button className="neo-button w-full" onClick={onNewConversation} data-testid="new-conversation-button">
        <MessageSquarePlus size={16} /> NEW SIGNAL
      </Button>

      <nav className="nav-stack" data-testid="primary-navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${active ? "active" : ""}`}
              data-testid={item.testid}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <section className="sidebar-section" data-testid="recent-conversations-section">
        <div className="section-head" data-testid="recent-conversations-heading">
          <RadioTower size={14} /> RECENT ROUTES
        </div>
        <div className="conversation-rail" data-testid="sidebar-conversation-list">
          {conversations.slice(0, 6).map((conversation) => (
            <button
              key={conversation.id}
              className={`conversation-chip ${conversation.id === activeConversationId ? "active" : ""}`}
              onClick={() => onSelectConversation(conversation.id)}
              data-testid={`sidebar-conversation-button-${conversation.id}`}
            >
              <span data-testid={`sidebar-conversation-title-${conversation.id}`}>{conversation.title}</span>
              <small data-testid={`sidebar-conversation-count-${conversation.id}`}>{conversation.message_count} MSG</small>
            </button>
          ))}
          {!conversations.length && <p className="empty-copy" data-testid="sidebar-empty-history">NO LOGS RECORDED</p>}
        </div>
      </section>
    </aside>
  );
};
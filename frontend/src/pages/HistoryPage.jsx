import { Trash2, RadioReceiver } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HistoryPage({ conversations, onSelectConversation, onDeleteConversation }) {
  return (
    <div className="history-page" data-testid="history-page">
      <header className="page-header" data-testid="history-page-header">
        <div>
          <p className="eyebrow" data-testid="history-page-eyebrow">PERSISTENT MEMORY</p>
          <h2 data-testid="history-page-title">Conversation Archives</h2>
        </div>
        <strong className="archive-count" data-testid="history-archive-count">{conversations.length} LOGS</strong>
      </header>
      <section className="archive-grid" data-testid="history-archive-grid">
        {conversations.map((conversation) => (
          <article className="archive-row" key={conversation.id} data-testid={`history-row-${conversation.id}`}>
            <button className="archive-main" onClick={() => onSelectConversation(conversation.id)} data-testid={`history-open-button-${conversation.id}`}>
              <RadioReceiver size={18} />
              <span>
                <strong data-testid={`history-title-${conversation.id}`}>{conversation.title}</strong>
                <small data-testid={`history-preview-${conversation.id}`}>{conversation.last_message_preview}</small>
              </span>
            </button>
            <div className="archive-meta" data-testid={`history-meta-${conversation.id}`}>
              <span data-testid={`history-message-count-${conversation.id}`}>{conversation.message_count} MSG</span>
              <time data-testid={`history-updated-time-${conversation.id}`}>{new Date(conversation.updated_at).toLocaleString()}</time>
            </div>
            <Button className="danger-button" onClick={() => onDeleteConversation(conversation.id)} data-testid={`history-delete-button-${conversation.id}`}>
              <Trash2 size={16} /> DELETE
            </Button>
          </article>
        ))}
        {!conversations.length && <p className="empty-copy" data-testid="history-empty-state">NO CONVERSATIONS SAVED YET</p>}
      </section>
    </div>
  );
}
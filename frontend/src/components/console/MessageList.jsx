import { Bot, UserRound } from "lucide-react";

export const MessageList = ({ messages, loading, booting }) => {
  if (booting) {
    return <div className="boot-loader" data-testid="chat-boot-loader">SYNCING MEMORY MATRIX...</div>;
  }

  if (!messages.length && !loading) {
    return (
      <div className="empty-chat" data-testid="empty-chat-state">
        <p data-testid="empty-chat-kicker">AWAITING FIRST TRANSMISSION</p>
        <h2 data-testid="empty-chat-title">Route a prompt through your llama-server endpoint.</h2>
      </div>
    );
  }

  return (
    <div className="message-list" data-testid="message-list">
      {messages.map((message) => {
        const isUser = message.role === "user";
        return (
          <article
            key={message.id}
            className={`message-row ${isUser ? "user" : "assistant"}`}
            data-testid={`message-row-${message.id}`}
          >
            <div className="message-meta" data-testid={`message-meta-${message.id}`}>
              {isUser ? <UserRound size={16} /> : <Bot size={16} />}
              <span data-testid={`message-role-${message.id}`}>{isUser ? "OPERATOR" : "NEO"}</span>
              <time data-testid={`message-time-${message.id}`}>{new Date(message.created_at).toLocaleTimeString()}</time>
            </div>
            <p data-testid={`message-content-${message.id}`}>{message.content}</p>
          </article>
        );
      })}
      {loading && <div className="typing-bar" data-testid="assistant-typing-indicator">NEO IS DECODING...</div>}
    </div>
  );
};
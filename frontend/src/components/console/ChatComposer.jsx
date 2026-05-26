import { useState } from "react";
import { Cpu, KeyRound, SendHorizontal, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const ChatComposer = ({ disabled, endpointReady, onSendMessage }) => {
  const [message, setMessage] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(768);

  const submit = (event) => {
    event.preventDefault();
    if (!message.trim() || disabled) return;
    onSendMessage({ message: message.trim(), temperature, maxTokens, apiKey });
    setMessage("");
  };

  return (
    <form className="composer" onSubmit={submit} data-testid="chat-composer-form">
      <div className="composer-controls" data-testid="composer-controls">
        <label data-testid="temperature-control-label">
          <SlidersHorizontal size={14} /> TEMP
          <Input
            className="neo-input control-input"
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(event) => setTemperature(Number(event.target.value))}
            data-testid="temperature-input"
          />
        </label>
        <label data-testid="max-tokens-control-label">
          <Cpu size={14} /> TOKENS
          <Input
            className="neo-input control-input"
            type="number"
            min="32"
            max="4096"
            step="32"
            value={maxTokens}
            onChange={(event) => setMaxTokens(Number(event.target.value))}
            data-testid="max-tokens-input"
          />
        </label>
        <label className="api-key-field" data-testid="api-key-control-label">
          <KeyRound size={14} /> KEY
          <Input
            className="neo-input"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="optional bearer token"
            data-testid="api-key-input"
          />
        </label>
      </div>
      <div className="prompt-row" data-testid="prompt-row">
        <Textarea
          className="neo-textarea"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={endpointReady ? "Transmit prompt..." : "Set endpoint in ENDPOINT before transmission..."}
          disabled={disabled}
          data-testid="chat-message-textarea"
        />
        <Button className="send-button" type="submit" disabled={disabled || !message.trim()} data-testid="send-message-button">
          <SendHorizontal size={18} /> SEND
        </Button>
      </div>
    </form>
  );
};
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, PlugZap, RadioTower, ServerCog, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage({ settings, connectionResult, onSaveSettings, onTestConnection }) {
  const [endpointUrl, setEndpointUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const command = settings?.model_command || "llama-server -hf darealmelo/OpenAi-GPT-oss-20b-abliterated-uncensored-NEO-Imatrix-gguf:Q5_1";

  useEffect(() => {
    setEndpointUrl(settings?.endpoint_url || "");
  }, [settings?.endpoint_url]);

  const save = async () => {
    setSaving(true);
    try {
      await onSaveSettings(endpointUrl);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      await onTestConnection(endpointUrl, apiKey);
    } finally {
      setTesting(false);
    }
  };

  const copyCommand = async () => {
    await navigator.clipboard.writeText(command);
  };

  return (
    <div className="settings-page" data-testid="settings-page">
      <header className="page-header" data-testid="settings-page-header">
        <div>
          <p className="eyebrow" data-testid="settings-page-eyebrow">MODEL ROUTING</p>
          <h2 data-testid="settings-page-title">llama-server Endpoint</h2>
        </div>
        <strong className="archive-count" data-testid="settings-model-id">{settings?.model_id}</strong>
      </header>

      <section className="settings-grid" data-testid="settings-grid">
        <div className="settings-panel" data-testid="endpoint-settings-panel">
          <div className="section-head" data-testid="endpoint-settings-heading"><PlugZap size={14} /> ENDPOINT URL</div>
          <label className="field-label" data-testid="endpoint-url-label">OPENAI-COMPATIBLE BASE URL</label>
          <Input
            className="neo-input large"
            value={endpointUrl}
            onChange={(event) => setEndpointUrl(event.target.value)}
            placeholder="https://your-host.example.com or http://127.0.0.1:8080"
            data-testid="endpoint-url-input"
          />
          <label className="field-label" data-testid="endpoint-api-key-label">OPTIONAL BEARER TOKEN FOR TESTING</label>
          <Input
            className="neo-input large"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="leave blank for local llama-server"
            data-testid="endpoint-api-key-input"
          />
          <div className="settings-actions" data-testid="settings-actions">
            <Button className="neo-button" onClick={save} disabled={!endpointUrl || saving} data-testid="save-endpoint-button">
              <ServerCog size={16} /> {saving ? "SAVING" : "SAVE ROUTE"}
            </Button>
            <Button className="neo-button cyan" onClick={test} disabled={!endpointUrl || testing} data-testid="test-endpoint-button">
              <RadioTower size={16} /> {testing ? "PINGING" : "TEST ROUTE"}
            </Button>
          </div>

          {connectionResult && (
            <div className={`connection-result ${connectionResult.ok ? "ok" : "fail"}`} data-testid="connection-test-result">
              {connectionResult.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              <div>
                <strong data-testid="connection-test-status">{connectionResult.ok ? "ONLINE" : "OFFLINE"}</strong>
                <p data-testid="connection-test-message">{connectionResult.message}</p>
                {!!connectionResult.models?.length && <small data-testid="connection-test-models">{connectionResult.models.join(" | ")}</small>}
              </div>
            </div>
          )}
        </div>

        <div className="settings-panel command-panel" data-testid="command-settings-panel">
          <div className="section-head" data-testid="command-settings-heading"><ServerCog size={14} /> START COMMAND</div>
          <pre data-testid="model-command-display">{command}</pre>
          <Button className="neo-button compact" onClick={copyCommand} data-testid="copy-command-button">
            <Copy size={15} /> COPY COMMAND
          </Button>
          <p className="command-note" data-testid="command-note">
            Start this model where the website backend can reach it, then save the reachable base URL above.
          </p>
        </div>
      </section>
    </div>
  );
}
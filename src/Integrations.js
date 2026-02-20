import React, { useState } from 'react';

export default function Integrations({ data = {} }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [status, setStatus] = useState(null);

  const exportJson = () => {
    try {
      const payload = JSON.stringify(data || {}, null, 2);
      // copy to clipboard (best-effort)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).catch(() => {});
      }
      // trigger file download
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fomo_data_export.json';
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ ok: true, msg: 'Exported JSON (download + clipboard)' });
    } catch (err) {
      setStatus({ ok: false, msg: `Export failed: ${err.message || err}` });
    }
  };

  const sendTestWebhook = async () => {
    if (!webhookUrl) {
      setStatus({ ok: false, msg: 'Please enter a webhook URL' });
      return;
    }

    setStatus({ ok: null, msg: 'Sending...' });
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'fomo_webhook_test', timestamp: Date.now(), payload: data }),
      });
      setStatus({ ok: resp.ok, msg: `HTTP ${resp.status} ${resp.statusText || ''}` });
    } catch (err) {
      setStatus({ ok: false, msg: err.message || String(err) });
    }
  };

  return (
    <div className="integrations-panel">
      <h2>Integrations & API — POC</h2>
      <p>Export your workspace data or send a test webhook (client-side demo).</p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <button className="done-btn" onClick={exportJson}>Export as JSON</button>
        <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(data || {}, null, 2)); setStatus({ ok: true, msg: 'Copied JSON to clipboard' }); }}>Copy JSON</button>
      </div>

      <section style={{ marginTop: 18 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Webhook URL (test)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://webhook.site/xxxx-xxxx"
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eefc' }}
          />
          <button className="done-btn" onClick={sendTestWebhook}>Send test webhook</button>
        </div>
        {status && (
          <div style={{ marginTop: 8, color: status.ok ? 'green' : (status.ok === null ? 'black' : 'crimson') }}>{status.msg}</div>
        )}
      </section>

      <section style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 8 }}>Sample webhook payload</h3>
        <pre style={{ maxHeight: 260, overflow: 'auto', background: '#fbfdff', padding: 12, borderRadius: 8, border: '1px solid #eef2ff' }}>
{JSON.stringify({ type: 'fomo_webhook_test', timestamp: '2026-02-20T00:00:00Z', payloadPreview: data }, null, 2)}
        </pre>
      </section>

      <p style={{ marginTop: 14, color: '#6b7280' }}><strong>Note:</strong> This is a client-side prototype — a production API will require auth, rate‑limits, and server endpoints.</p>
    </div>
  );
}

"use client";
import React, { useState, useRef, useEffect } from "react";

interface Props {
  projectExport: any;
  onClose: () => void;
  onApplyBlueprint: (blueprint: any) => void;
  onAddSubproject: (title: string) => void;
}

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  meta?: any;
}

export default function ProjectAssistant({ projectExport, onClose, onApplyBlueprint, onAddSubproject }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [appliedActionIds, setAppliedActionIds] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  const genId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const extractTitleFromLabel = (label: string) => {
    if (!label) return 'New Item';
    const q = label.match(/['"]([^'"]+)['"]/);
    if (q && q[1]) return q[1];
    const m = label.match(/add\s+(.+?)\s+to\s+/i);
    if (m && m[1]) return m[1].trim();
    return label;
  }

  const normalizeAction = (a: any) => {
    if (!a) return a;
    if (typeof a === 'string') {
      const label = a;
      const title = extractTitleFromLabel(label);
      return { type: 'add_task', label, payload: { title, description: title } };
    }
    let type = (a.type || a.action || a.kind || '').toString();
    // normalize common provider button types to add_task
    if (type.toLowerCase() === 'button' || type.toLowerCase() === 'add_to_list' || type.toLowerCase() === 'add-to-list') type = 'add_task';
    if (type.toLowerCase() === 'add-task') type = 'add_task';
    const payload = { ...(a.payload || {}) };
    // prefer description/title aliases
    payload.title = payload.title || payload.description || payload.text || extractTitleFromLabel(a.label || '');
    if (payload.description === undefined && payload.title) payload.description = payload.title;

    let label = a.label;
    if (!label || label === type) {
      if (type === 'batch_update' || type === 'batch_actions') {
        const actionCount = Array.isArray(payload.actions) ? payload.actions.length : 0;
        label = actionCount > 0 ? `Apply ${actionCount} Changes` : 'Apply Multiple Changes';
      } else if (type === 'add_subproject') {
        label = `Add new list: ${payload.title || 'New List'}`;
      } else if (type === 'add_task') {
        label = `Add ${payload.title || 'item'}`;
      } else if (type === 'remove_task') {
        label = `Remove ${payload.taskId || 'item'}`;
      } else {
        label = 'Apply Action';
      }
    }

    return { ...a, type, payload, label };
  }

  useEffect(() => {
    // seed system message
    setMessages([{ id: 'sys-1', role: 'assistant', text: "Hi! I'm the FOMO Helper. How can I help you manage this project today?" }]);
  }, []);

  useEffect(() => {
    // scroll to bottom
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    setInput("");

    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text, project: projectExport, history: messages.map(x=>({role:x.role,text:x.text})) })
      });
      const data = await resp.json();
      if (data.error) {
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: `Error: ${data.error}` }]);
      } else {
        let assistantText = data.text || 'Response received.';
        // normalize actions: provider may return structured `actions` or JSON embedded in `text`
        let actions = Array.isArray(data.actions) ? data.actions : null;
        if (typeof assistantText === 'string') {
          // extract JSON parts manually to handle both complete and truncated JSON blobs
          const textMatch = assistantText.match(/"text"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
            if (textMatch && textMatch[1]) {
            assistantText = textMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
            const actionsMatch = data.text?.match(/"actions"\s*:\s*(\[\s*\{.*(?:\}|\]))/s);
            if (actionsMatch && !actions) {
               let actionsStr = actionsMatch[1];
               for (let i=0; i<10; i++) {
                 try {
                   const parsed = JSON.parse(actionsStr);
                   if (Array.isArray(parsed)) { actions = parsed; break; }
                 } catch(e) {
                   actionsStr += i % 3 === 0 ? ']' : '}'; // attempt to balance brackets
                 }
               }
            }
          } else {
            // try to find and parse a complete JSON blob inside the assistant text if textMatch failed
            const jsonMatch = assistantText.match(/```json\s*(\{[\s\S]*?\})\s*```/) || assistantText.match(/(\{[\s\S]*"actions"[\s\S]*\})/);
            if (jsonMatch && jsonMatch[1]) {
              try {
                const parsed = JSON.parse(jsonMatch[1]);
                if (parsed && Array.isArray(parsed.actions)) {
                  if (!actions) actions = parsed.actions;
                  assistantText = assistantText.replace(jsonMatch[0], '').trim() || parsed.text || 'Response received.';
                }
              } catch (e) {
                // ignore parse errors
              }
            } else if (!actions && assistantText.indexOf('{') !== -1) {
              const jsonStart = assistantText.indexOf('{');
              const maybeJson = assistantText.slice(jsonStart);
              try {
                const parsed = JSON.parse(maybeJson);
                if (parsed && Array.isArray(parsed.actions)) {
                  actions = parsed.actions;
                  assistantText = assistantText.slice(0, jsonStart).trim() || parsed.text || 'Response received.';
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }
        const hasActions = Array.isArray(actions) && actions.length > 0;
        if (hasActions) {
          const claimRegex = /(I('|’)ve|I have|I added|Added|I've added)\b/i;
          if (claimRegex.test(assistantText)) {
            assistantText = 'I suggest the following actions. Click an action to apply it to the project.';
          } else {
            assistantText = assistantText ? `${assistantText}\n\nSuggested actions:` : 'Suggested actions:';
          }
        }
        let normalized = Array.isArray(actions) ? actions.map(normalizeAction) : (Array.isArray(data.actions) ? data.actions.map(normalizeAction) : []);
        const validTypes = new Set([
          'add_subproject', 'remove_subproject', 'remove-subproject',
          'update_project', 'apply_patch', 'copy_text', 'suggestion',
          'add_task', 'add-task', 'add-row', 'add_to_list',
          'remove_task', 'remove-task', 'remove', 'removetask',
          'edit_task', 'edit-task', 'edit', 'edittask',
          'batch_actions', 'batch_update', 'batchupdate'
        ]);
        normalized = normalized.filter((a: any) => a && a.type && validTypes.has(String(a.type).toLowerCase()));
        
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: assistantText, meta: { actions: normalized } }]);
      }
    } catch (err: any) {
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: `Error: ${String(err)}` }]);
    } finally {
      setLoading(false);
    }
  }

  const copyConversation = async () => {
    try {
      const text = messages.map(m => {
        let txt = `${m.role.toUpperCase()}: ${m.text}`;
        if (m.meta && Array.isArray(m.meta.actions) && m.meta.actions.length) {
          const labels = m.meta.actions.map((act: any) => (typeof act === 'string' ? act : (act.label || act.type || JSON.stringify(act))));
          txt += '\n\nActions:\n' + labels.map((l: string) => `- ${l}`).join('\n');
        }
        return txt;
      }).join('\n\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  }

  return (
    <div className="assistant-modal" role="dialog" aria-modal="true">
      <div className="assistant-backdrop" onClick={onClose} />
      <div className="assistant-panel">
        <div className="assistant-header">
          <h3>FOMO Helper</h3>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <button className="copy-btn" onClick={copyConversation} aria-label="Copy conversation">📋</button>
            {copied ? <span className="copied-badge" aria-live="polite">Copied!</span> : null}
            <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className="assistant-body" ref={listRef}>
          {messages.map((m) => (
            <div key={m.id} className={`assistant-message assistant-message--${m.role}`}>
              <div className="assistant-message__text">{m.text}</div>
              {m.role === 'assistant' && m.meta && Array.isArray(m.meta.actions) && (
                <div className="assistant-actions">
                  {m.meta.actions.map((a: any, i:number) => {
                    const action = normalizeAction(a);
                    const actionId = action.id || `${i}-${String(action.type)}`;
                    const disabled = !!appliedActionIds[actionId];
                    return (
                      <button
                        key={actionId}
                        onClick={() => {
                          if (disabled) return;
                          setAppliedActionIds((prev) => ({ ...prev, [actionId]: true }));
                          if (action.type === 'add_subproject') {
                            const title = action.payload?.title || action.label || 'New Subproject';
                            onAddSubproject(title);
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Added subproject: ${title}` }]);
                          } else if ((action.type === 'update_project' || action.type === 'apply_patch') && action.payload) {
                            onApplyBlueprint?.(action.payload);
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Applied suggested project update.` }]);
                          } else if (action.type === 'copy_text') {
                            const txt = action.payload?.text || action.label || '';
                            if (txt) {
                              try { navigator.clipboard.writeText(txt); } catch {}
                              setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Copied text to clipboard.` }]);
                            }
                          } else if (action.type === 'suggestion') {
                            // handle generic suggestions payloads { items: string[] } by adding them to a TV List
                            const items: string[] = action.payload?.items || (Array.isArray(action.payload) ? action.payload : []);
                            if (items && items.length > 0) {
                              // build new tasks for each suggestion
                              const newTasks = items.map((it) => ({ id: genId('task'), description: it }));
                              // find existing tv list subproject in projectExport
                              const existingSubs = (projectExport?.sub_projects || []).map((s: any) => ({
                                id: s.id || genId('sub'),
                                title: s.title || s.text || '',
                                isProjectLevel: !!s.isProjectLevel,
                                description: s.description || null,
                                color: s.color || null,
                                owners: s.owners || null,
                                tasks: (s.tasks || []).map((t: any) => ({ id: t.id || genId('task'), description: t.description || t.text || '' }))
                              }));
                              let tvSub = existingSubs.find((s: any) => (s.title || '').toLowerCase().includes('tv'));
                              let updatedSubs = existingSubs;
                              if (tvSub) {
                                updatedSubs = existingSubs.map((s: any) => s.id === tvSub.id ? { ...s, tasks: [...(s.tasks || []), ...newTasks] } : s);
                              } else {
                                const newSub = { id: genId('sub'), title: 'TV List', isProjectLevel: false, description: null, color: null, owners: null, tasks: newTasks };
                                updatedSubs = [...existingSubs, newSub];
                              }
                              // send patch to parent to apply
                              onApplyBlueprint?.({ subprojects: updatedSubs });
                              setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Added ${items.length} suggestion(s) to TV List.` }]);
                            } else {
                              // fallback: copy the suggestion text to clipboard
                              const txt = action.payload?.text || action.label || '';
                              if (txt) {
                                try { navigator.clipboard.writeText(txt); } catch {}
                                setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Copied suggestion text to clipboard.` }]);
                              } else {
                                setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Suggestion received.` }]);
                              }
                            }
                          } else if (action.type === 'add_task' || action.type === 'add-task' || action.type === 'add-row' || action.type === 'add_task' || action.type === 'add_to_list') {
                            // Forward generic add task action (already normalized)
                            onApplyBlueprint?.(action);
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Successfully added task: "${action.payload?.title || action.label || 'item'}".` }]);
                          } else if (action.type === 'remove_subproject' || action.type === 'remove-subproject') {
                            onApplyBlueprint?.(action);
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Successfully removed subproject.` }]);
                          } else if (action.type === 'remove-task' || action.type === 'remove_task' || action.type === 'remove' || action.type === 'removeTask') {
                            onApplyBlueprint?.(action);
                            const itemName = action.payload?.title || action.payload?.description || action.payload?.taskId || action.payload?.id || 'item';
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Successfully removed task: "${itemName}".` }]);
                          } else if (action.type === 'edit-task' || action.type === 'edit_task' || action.type === 'edit') {
                            onApplyBlueprint?.(action);
                            const itemName = action.payload?.title || action.payload?.description || action.payload?.taskId || action.payload?.id || 'item';
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Successfully edited task: "${itemName}".` }]);
                          } else if (action.type === 'batch_actions' || action.type === 'batch_update' || action.type === 'batchupdate') {
                            onApplyBlueprint?.(action);
                            let details = "Successfully applied bulk actions.";
                            if (Array.isArray(action.payload?.actions)) {
                              const affected = action.payload.actions
                                .map((sub: any) => sub.payload?.title || sub.payload?.description || sub.payload?.text || sub.payload?.taskId || sub.payload?.id)
                                .filter(Boolean);
                              if (affected.length > 0) {
                                details = `Successfully applied bulk actions on: ${affected.join(', ')}.`;
                              }
                            }
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: details }]);
                          } else {
                            console.warn('Unknown action type', action);
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Unknown action: ${action.type}` }]);
                          }
                        }}
                        disabled={disabled}
                        className="assistant-action"
                      >{action.label}</button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

        </div>

        <div className="assistant-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="Ask the assistant to modify this project (e.g., 'Add a QA subproject with 3 tasks')"
            aria-label="Message"
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}>Send</button>
        </div>
      </div>

      <style jsx>{`
        .assistant-modal { position: fixed; inset: 0; z-index: 12000; display: flex; align-items: center; justify-content: center; }
        .assistant-backdrop { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); } 
        .assistant-panel { 
          position: relative;
          background: #fafafa;
          width: 850px; height: 85vh;
          max-width: 95vw; max-height: 95vh;
          border-radius: 16px;
          display: flex; flex-direction: column;
          font-family: Roboto, "Helvetica Neue", Arial, sans-serif;
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
        }
        .assistant-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; height: 64px; min-height: 64px;
          background: #6200ea; color: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 10;
        }
        .assistant-header h3 { margin: 0; font-size: 1.25rem; font-weight: 500; letter-spacing: 0.5px; }
        .copy-btn, .close-btn {
          background: transparent; border: none; color: white;
          width: 40px; height: 40px; border-radius: 50%;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; transition: background 0.2s ease;
        }
        .copy-btn:hover, .close-btn:hover { background: rgba(255,255,255,0.1); }
        .copied-badge { font-size: 0.85rem; color: #bb86fc; font-weight: 500; }
        
        .assistant-body {
          flex: 1; padding: 24px; overflow-y: auto;
          display: flex; flex-direction: column; gap: 16px;
        }
        .assistant-message { display: flex; flex-direction: column; }
        .assistant-message--user { align-self: flex-end; max-width: 80%; }
        .assistant-message--user .assistant-message__text {
          background: #6200ea; color: white;
          padding: 12px 16px; border-radius: 20px 20px 4px 20px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.15); line-height: 1.5; font-size: 0.95rem;
        }
        .assistant-message--assistant { align-self: flex-start; max-width: 85%; }
        .assistant-message--assistant .assistant-message__text {
          background: #ffffff; color: #333;
          padding: 14px 18px; border-radius: 20px 20px 20px 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1); line-height: 1.6; font-size: 0.95rem;
        }
        .assistant-message--system { align-self: center; text-align: center; }
        .assistant-message--system .assistant-message__text {
          background: transparent; color: #9e9e9e; font-size: 0.85rem; padding: 4px; font-weight: 500;
        }
        
        .assistant-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .assistant-action {
          background: white; color: #6200ea;
          border: 1px solid rgba(98, 0, 234, 0.3); border-radius: 24px;
          padding: 8px 16px; font-size: 0.875rem; font-weight: 500; letter-spacing: 0.5px;
          cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.2s ease;
        }
        .assistant-action:hover:not(:disabled) { background: rgba(98, 0, 234, 0.04); border-color: #6200ea; }
        .assistant-action:disabled { opacity: 0.6; cursor: default; background: #f5f5f5; border-color: #ddd; color: #999; }
        
        .assistant-input {
          display: flex; gap: 16px; align-items: center;
          padding: 16px 24px; background: white;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.05); z-index: 10;
        }
        .assistant-input input {
          flex: 1; padding: 14px 20px; font-size: 1rem;
          background: #f5f5f5; border: 1px solid transparent; border-radius: 28px;
          transition: all 0.2s ease;
        }
        .assistant-input input:focus {
          outline: none; background: white; border-color: #6200ea; box-shadow: 0 2px 6px rgba(98,0,234,0.1);
        }
        .assistant-input button {
          background: #6200ea; color: white; border: none; border-radius: 28px;
          padding: 12px 24px; font-size: 0.95rem; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;
          cursor: pointer; box-shadow: 0 2px 6px rgba(98,0,234,0.3); transition: all 0.2s ease;
        }
        .assistant-input button:hover:not(:disabled) { background: #651fff; box-shadow: 0 4px 8px rgba(98,0,234,0.4); }
        .assistant-input button:disabled { background: #e0e0e0; color: #9e9e9e; box-shadow: none; cursor: default; }
      `}</style>
    </div>
  );
}

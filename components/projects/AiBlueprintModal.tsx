import React, { useState, useEffect } from 'react';

export interface AiBlueprintModalProps {
  onClose: () => void;
  onConfirm: (data: any, formData: {goal: string, targetDate: string, context: string}) => Promise<void>;
  initialValues?: {
    goal?: string;
    targetDate?: string;
    context?: string;
  };
  isForExistingProject?: boolean;
  existingSubprojects?: any[];
}

interface TaskDraft {
  id: string;
  description: string;
  priority: string;
  effort?: number | null;
  deadline_offset_days: number;
  selected: boolean;
  done?: boolean;
}

interface SubprojectDraft {
  id: string;
  title: string;
  selected: boolean;
  tasks: TaskDraft[];
}

interface BlueprintDraft {
  project_name: string;
  sub_projects: SubprojectDraft[];
}

export default function AiBlueprintModal({ onClose, onConfirm, initialValues, isForExistingProject = false, existingSubprojects }: AiBlueprintModalProps) {
  const [step, setStep] = useState<'chat' | 'processing' | 'review'>('chat');

  // Chat / Form State
  const [goal, setGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [complexity, setComplexity] = useState('Standard');
  const [context, setContext] = useState('');
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<Array<{role: 'user'|'assistant', text: string}>>([]);

  // Draft State
  const [draft, setDraft] = useState<BlueprintDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Update form state when initialValues change
  useEffect(() => {
    if (initialValues) {
      setGoal(initialValues.goal || '');
      setTargetDate(initialValues.targetDate || '');
      setContext(initialValues.context || '');
    }
  }, [initialValues]);

  const handleRunChat = async () => {
    // Build combined prompt/context
    const prompt = `${userInput || ''}\n\nContext: ${context || ''}`.trim();

    setMessages((m) => [...m, { role: 'user', text: userInput }]);

    setStep('processing');
    try {
      // Convert existing subprojects to draft format expected by API
      let convertedExisting: any[] = [];
      if (existingSubprojects) {
        convertedExisting = existingSubprojects.map((sp: any) => ({
          title: sp.text,
          tasks: (sp.tasks || []).map((t: any) => ({
            description: t.text,
            priority: t.priority || 'Medium',
            effort: t.effort || 1,
            deadline_offset_days: t.dueDate ? Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 7,
            done: t.done
          }))
        }));
      }

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal || userInput, targetDate, complexity, context: prompt, existingSubprojects: convertedExisting, isForExistingProject }),
      });

      if (!res.ok) throw new Error('Failed to generate blueprint');

      const data = await res.json();

      // Append assistant message (summarized)
      setMessages((m) => [...m, { role: 'assistant', text: `AI suggested ${ (data.sub_projects || []).length } subproject(s).` }]);

      const initializedDraft: BlueprintDraft = {
        project_name: data.project_name || (goal || 'New Project'),
        sub_projects: (data.sub_projects || []).map((sp: any, i: number) => ({
          ...sp,
          id: `sp-${i}`,
          selected: true,
          tasks: (sp.tasks || []).map((t: any, j: number) => ({
            ...t,
            id: `task-${i}-${j}`,
            selected: true,
            done: t.done || false
          }))
        }))
      };

      setDraft(initializedDraft);
      setStep('review');
    } catch (err) {
      console.error(err);
      alert('Error generating blueprint.');
      setStep('chat');
    }
  };

  const toggleSubproject = (spId: string) => {
    if (!draft) return;
    setDraft((prev: BlueprintDraft | null) => {
      if (!prev) return prev;
      const spIndex = prev.sub_projects.findIndex(sp => sp.id === spId);
      if (spIndex === -1) return prev;
      
      const oldSp = prev.sub_projects[spIndex];
      if (!oldSp) return prev;
      
      const newSelected = !oldSp.selected;
      
      const newSp: SubprojectDraft = { 
        id: oldSp.id,
        title: oldSp.title,
        selected: newSelected,
        tasks: oldSp.tasks.map(t => ({ ...t, selected: newSelected }))
      };
      
      const newSubProjects = [...prev.sub_projects];
      newSubProjects[spIndex] = newSp;
      return { ...prev, sub_projects: newSubProjects };
    });
  };

  const toggleTask = (spId: string, taskId: string) => {
    if (!draft) return;
    setDraft(prev => {
      if (!prev) return prev;
      const newSubProjects = prev.sub_projects.map(sp => {
        if (sp.id !== spId) return sp;
        const newTasks = sp.tasks.map(t => t.id === taskId ? (t.done ? t : { ...t, selected: !t.selected }) : t);
        // If all tasks deselected, possibly deselect SP? We will just let them be independent.
        // Actually, if at least one task is selected, select the SP.
        const anySelected = newTasks.some(t => t.selected);
        return { ...sp, tasks: newTasks, selected: anySelected };
      });
      return { ...prev, sub_projects: newSubProjects };
    });
  };

  const updateTaskDescription = (spId: string, taskId: string, newDesc: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sub_projects: prev.sub_projects.map(sp => sp.id !== spId ? sp : {
          ...sp,
          tasks: sp.tasks.map(t => t.id !== taskId ? t : { ...t, description: newDesc })
        })
      };
    });
  };

  const updateProjectName = (name: string) => {
    setDraft(prev => prev ? { ...prev, project_name: name } : prev);
  };

  const updateTaskPriority = (spId: string, taskId: string, priority: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sub_projects: prev.sub_projects.map(sp => sp.id !== spId ? sp : {
          ...sp,
          tasks: sp.tasks.map(t => t.id !== taskId ? t : { ...t, priority })
        })
      };
    });
  };

  const updateTaskEffort = (spId: string, taskId: string, effort: number | null) => {
    setDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sub_projects: prev.sub_projects.map(sp => sp.id !== spId ? sp : {
          ...sp,
          tasks: sp.tasks.map(t => t.id !== taskId ? t : { ...t, effort })
        })
      };
    });
  };

  const handleConfirm = async () => {
    if (!draft) return;
    setIsSaving(true);
    
    // Filter out deselected
    const finalData = {
      project_name: draft.project_name,
      sub_projects: draft.sub_projects
        .filter(sp => sp.selected)
        .map(sp => ({
          title: sp.title,
          tasks: sp.tasks
            .filter(t => t.selected)
            .map(t => ({
              description: t.description,
              priority: t.priority,
              effort: t.effort,
              deadline_offset_days: t.deadline_offset_days,
              done: t.done
            }))
        }))
    };

    try {
      await onConfirm(finalData, { goal, targetDate, context });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save blueprint.");
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-content" style={modalContentStyle}>
        
        {step === 'chat' && (
          <div style={containerStyle}>
            <h2>AI Assistant</h2>
            <p style={{ color: '#666', marginBottom: '12px' }}>Ask the assistant what you'd like to do with this project. Select a template or type your request.</p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setUserInput('Remove completed tasks older than 30 days')} style={cancelBtnStyle}>Remove some tasks</button>
              <button onClick={() => setUserInput('Add tasks to expand the project with onboarding steps')} style={cancelBtnStyle}>Add to project</button>
              <button onClick={() => setUserInput('Prioritize high-risk tasks and mark low priority as later')} style={cancelBtnStyle}>Reprioritize</button>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Your request</label>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="e.g. Remove duplicate tasks and add 3 onboarding steps"
                style={inputStyle}
                rows={3}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Project Overview (for context)</label>
              <textarea value={goal || ''} onChange={(e) => setGoal(e.target.value)} placeholder="Project goal/description" style={inputStyle} rows={2} />
            </div>

            <div style={actionsStyle}>
              <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
              <button 
                onClick={handleRunChat} 
                style={{...primaryBtnStyle, opacity: userInput.trim() ? 1 : 0.6}}
                disabled={!userInput.trim()}
              >
                Run
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div style={{...containerStyle, textAlign: 'center', padding: '40px 0'}}>
            <div style={{ fontSize: '48px', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>
              <span className="material-icons" style={{ fontSize: '48px', color: '#d32998' }}>psychology</span>
            </div>
            <h2>Analyzing request...</h2>
            <p style={{ color: '#666' }}>Processing your request against the existing project data.</p>
          </div>
        )}

        {step === 'review' && draft && (
          <div style={{ ...containerStyle }}>
            <h2>Review Blueprint</h2>
            
            {!isForExistingProject && (
              <div style={{ marginBottom: '16px' }}>
                <input 
                  type="text" 
                  value={draft.project_name} 
                  onChange={(e) => updateProjectName(e.target.value)}
                  style={{ ...inputStyle, fontSize: '18px', fontWeight: 'bold' }}
                />
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #eee', paddingTop: '16px', marginBottom: '16px', minHeight: 0 }}>
              {draft.sub_projects.map(sp => (
                <div key={sp.id} style={{ marginBottom: '20px', border: '1px solid #eaeaea', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={sp.selected}
                      onChange={() => toggleSubproject(sp.id)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <h3 style={{ margin: 0, fontSize: '16px', color: sp.selected ? '#333' : '#aaa' }}>{sp.title}</h3>
                  </div>

                  {sp.tasks.map(t => (
                    <div key={t.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      marginLeft: '28px',
                      marginBottom: '8px',
                      opacity: t.selected ? 1 : 0.5
                    }}>
                      <input 
                        type="checkbox" 
                        checked={t.selected}
                        onChange={() => toggleTask(sp.id, t.id)}
                        disabled={t.done}
                        style={{ cursor: t.done ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                      />
                      {t.done && <span className="material-icons" style={{ fontSize: '16px', color: 'green', marginRight: '4px' }}>check_circle</span>}
                      <input 
                        type="text" 
                        value={t.description}
                        onChange={(e) => updateTaskDescription(sp.id, t.id, e.target.value)}
                        style={{ ...inputStyle, flex: 1, margin: 0, padding: '4px 8px' }}
                      />
                      <input 
                        type="number"
                        title="Effort in days"
                        placeholder="Days"
                        step="0.1"
                        min="0"
                        value={t.effort ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateTaskEffort(sp.id, t.id, val ? parseFloat(val) : null)
                        }}
                        style={{ ...inputStyle, width: '70px', margin: 0, padding: '4px 8px' }}
                      />
                      <div style={{ width: '130px', display: 'flex', justifyContent: 'center' }}>
                        <button
                          title={`Priority: ${t.priority.charAt(0).toUpperCase() + t.priority.slice(1).toLowerCase()} (click to change)`}
                          onClick={() => {
                            const priorities = ['Low', 'Medium', 'High'] as const;
                            const normalizedPriority = t.priority.charAt(0).toUpperCase() + t.priority.slice(1).toLowerCase();
                            const currentIndex = priorities.indexOf(normalizedPriority as 'Low' | 'Medium' | 'High');
                            const nextIndex = ((currentIndex + 1) % priorities.length) as 0 | 1 | 2;
                            updateTaskPriority(sp.id, t.id, priorities[nextIndex] as 'Low' | 'Medium' | 'High');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#d32998',
                            fontSize: '18px',
                            padding: '2px'
                          }}
                        >
                          <span className="material-icons">
                            {t.priority?.toLowerCase() === 'low' ? 'arrow_downward' : t.priority?.toLowerCase() === 'medium' ? 'remove' : 'arrow_upward'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={actionsStyle}>
              <button 
                onClick={() => setStep('chat')} 
                style={cancelBtnStyle}
                disabled={isSaving}
              >
                Back
              </button>
              <button 
                onClick={handleConfirm} 
                style={primaryBtnStyle}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : (isForExistingProject ? 'Apply Changes' : 'Confirm & Create Project')}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Inline styles for speed since we don't have a specific modal component predefined
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 11000
};

const modalContentStyle: React.CSSProperties = {
  background: '#fff',
  width: '90%', maxWidth: '600px',
  maxHeight: '90vh',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden' // So inner scroll works
};

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: '16px'
};

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#444'
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px',
  border: '1px solid #ccc', borderRadius: '6px',
  fontFamily: 'inherit', fontSize: '14px'
};

const actionsStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px'
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '10px 16px', background: 'transparent', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 500
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 16px', background: '#d32998', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500
};

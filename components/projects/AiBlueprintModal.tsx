import React, { useState } from 'react';

export interface AiBlueprintModalProps {
  onClose: () => void;
  onConfirm: (data: any) => Promise<void>;
}

interface TaskDraft {
  id: string;
  description: string;
  priority: string;
  effort?: number | null;
  deadline_offset_days: number;
  selected: boolean;
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

export default function AiBlueprintModal({ onClose, onConfirm }: AiBlueprintModalProps) {
  const [step, setStep] = useState<'input' | 'processing' | 'review'>('input');
  
  // Form State
  const [goal, setGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [complexity, setComplexity] = useState('Standard');
  const [context, setContext] = useState('');

  // Draft State
  const [draft, setDraft] = useState<BlueprintDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    if (!goal.trim()) {
      alert("Please provide a project goal.");
      return;
    }
    
    setStep('processing');
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, targetDate, complexity, context }),
      });
      
      if (!res.ok) throw new Error('Failed to generate blueprint');
      
      const data = await res.json();
      
      // Inject local ids and selection state for review phase
      const initializedDraft: BlueprintDraft = {
        project_name: data.project_name || 'New Project',
        sub_projects: (data.sub_projects || []).map((sp: any, i: number) => ({
          ...sp,
          id: `sp-${i}`,
          selected: true,
          tasks: (sp.tasks || []).map((t: any, j: number) => ({
            ...t,
            id: `task-${i}-${j}`,
            selected: true
          }))
        }))
      };
      
      setDraft(initializedDraft);
      setStep('review');
    } catch (err) {
      console.error(err);
      alert("Error generating blueprint.");
      setStep('input');
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
        const newTasks = sp.tasks.map(t => t.id === taskId ? { ...t, selected: !t.selected } : t);
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
              deadline_offset_days: t.deadline_offset_days
            }))
        }))
    };

    try {
      await onConfirm(finalData);
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
        
        {step === 'input' && (
          <div style={containerStyle}>
            <h2>Generate with AI</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>Describe your goal and let AI create a project blueprint for you.</p>
            
            <div style={formGroupStyle}>
              <label style={labelStyle}>Project Goal *</label>
              <textarea 
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="What does success look like?"
                style={inputStyle}
                rows={3}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Target Completion</label>
              <input 
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Complexity Level</label>
              <select value={complexity} onChange={e => setComplexity(e.target.value)} style={inputStyle}>
                <option>Simple</option>
                <option>Standard</option>
                <option>Detailed</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Additional Context (Optional)</label>
              <textarea 
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Specific tools, constraints, or must-haves..."
                style={inputStyle}
                rows={2}
              />
            </div>

            <div style={actionsStyle}>
              <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
              <button 
                onClick={handleGenerate} 
                style={{...primaryBtnStyle, opacity: goal.trim() ? 1 : 0.5}}
                disabled={!goal.trim()}
              >
                Generate Blueprint
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div style={{...containerStyle, textAlign: 'center', padding: '40px 0'}}>
            <div style={{ fontSize: '48px', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>
              <span className="material-icons" style={{ fontSize: '48px', color: '#d32998' }}>psychology</span>
            </div>
            <h2>Drafting your blueprint...</h2>
            <p style={{ color: '#666' }}>Analyzing goals and structuring tasks.</p>
          </div>
        )}

        {step === 'review' && draft && (
          <div style={{ ...containerStyle }}>
            <h2>Review Blueprint</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <input 
                type="text" 
                value={draft.project_name} 
                onChange={(e) => updateProjectName(e.target.value)}
                style={{ ...inputStyle, fontSize: '18px', fontWeight: 'bold' }}
              />
            </div>

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
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
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
                      <select
                        title="Task Priority"
                        value={t.priority}
                        onChange={(e) => updateTaskPriority(sp.id, t.id, e.target.value)}
                        style={{ ...inputStyle, width: '130px', margin: 0, padding: '4px 8px' }}>
                        <option value="Low">Low Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="High">High Priority</option>
                      </select>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={actionsStyle}>
              <button 
                onClick={() => setStep('input')} 
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
                {isSaving ? 'Saving...' : 'Confirm & Create Project'}
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
  zIndex: 1000
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

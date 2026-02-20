import React, { useState, useEffect } from 'react';
import TaskEditor from './TaskModal';

import logoDiscord from './assets/icons/logo_discord.png';
import logoSms from './assets/icons/logo_sms.png';
import logoWhatsapp from './assets/icons/logo_whatsapp.png';



import './App.css';

// normalize image imports (handle bundlers that export asset objects)
const assetUrl = (a) => (a && typeof a === 'object' && 'default' in a) ? a.default : a;

const STORAGE_KEY = 'fomo_life_data';

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { tasks: [], projects: [], dreams: [], people: [] };
  } catch {
    return { tasks: [], projects: [], dreams: [], people: [] };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


function App() {
  const [data, setData] = useState(loadData());
  const [input, setInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState('tasks');
  const [editorTaskIdx, setEditorTaskIdx] = useState(null);
  const [editingPersonIdx, setEditingPersonIdx] = useState(null);
  const [editingPersonName, setEditingPersonName] = useState('');
  const [iconStatus, setIconStatus] = useState([]);

  useEffect(() => {
    const update = () => {
      const imgs = Array.from(document.querySelectorAll('img.service-icon'));
      const status = imgs.map(img => ({
        src: img.getAttribute('src') || img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth || 0,
        display: window.getComputedStyle(img).display,
      }));
      setIconStatus(status);
      // also log to console to help debugging
      console.log('icon-status', status);
    };
    // give images a moment to load and run twice
    const t1 = setTimeout(update, 200);
    const t2 = setTimeout(update, 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [type, editorTaskIdx]);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const handleAdd = () => {
    if (!input.trim()) return;
    if (type === 'tasks') {
      setData(prev => ({
        ...prev,
        tasks: [
          ...prev.tasks,
          { text: input, done: false, dueDate: dueDate || null, favorite: false, people: [] },
        ],
      }));
      setDueDate('');
    } else if (type === 'people') {
      const name = input.trim();
      setData(prev => ({
        ...prev,
        people: prev.people.find(p => p.name === name) ? prev.people : [...prev.people, { name, methods: { discord: false, sms: false, whatsapp: false } }]
      }));
    } else {
      setData(prev => ({
        ...prev,
        [type]: [...prev[type], { text: input, done: false }],
      }));
    }
    setInput('');
  };

  const handleToggle = (idx) => {
    setData(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => i === idx ? { ...item, done: !item.done } : item),
    }));
  };

  const handleDelete = (idx) => {
    if (type === 'people') {
      const name = data.people[idx].name;
      setData(prev => ({
        ...prev,
        people: prev.people.filter((_, i) => i !== idx),
        tasks: prev.tasks.map(t => ({
          ...t,
          people: (t.people || []).filter(p => p.name !== name)
        }))
      }));
      return;
    }
    setData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== idx),
    }));
  };

  const handleStar = (idx) => {
    if (type !== 'tasks') return;
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map((item, i) => i === idx ? { ...item, favorite: !item.favorite } : item),
    }));
  };

  const handleTogglePersonDefault = (idx, method) => {
    const person = data.people[idx];
    setData(prev => ({
      ...prev,
      people: prev.people.map((p, i) => i === idx ? { ...p, methods: { ...p.methods, [method]: !p.methods[method] } } : p),
      // update tasks to keep person defaults in sync
      tasks: prev.tasks.map(t => ({
        ...t,
        people: (t.people || []).map(tp => tp.name === person.name ? { ...tp, methods: { ...tp.methods, [method]: !person.methods[method] } } : tp)
      }))
    }));
  };

  const handleEditorSave = (updatedTask) => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map((t, i) => i === editorTaskIdx ? { ...t, ...updatedTask } : t),
    }));
    setEditorTaskIdx(null);
  };

  // persist changes from editor without closing it (used for autosave / unmount)
  const handleEditorUpdate = (updatedTask) => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map((t, i) => i === editorTaskIdx ? { ...t, ...updatedTask } : t),
    }));
  };

  const handleEditorClose = () => setEditorTaskIdx(null);

  return (
    <div className="main-layout">
      <div className="container">
        <div className="app-bar">
          <img src="/logo_fomo.jpg" alt="FOMO Life logo" className="app-logo" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
          <div className="app-title">FOMO Life</div>
        </div>
        <div className="tabs">
          <button className={type === 'tasks' ? 'active' : ''} onClick={() => setType('tasks')}>Tasks</button>
          <button className={type === 'projects' ? 'active' : ''} onClick={() => setType('projects')}>Projects</button>
          <button className={type === 'dreams' ? 'active' : ''} onClick={() => setType('dreams')}>Dreams</button>
          <button className={type === 'people' ? 'active' : ''} onClick={() => setType('people')}>People</button>
        </div>
        <div className="add-bar">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Add a new ${type === 'people' ? 'person' : type.slice(0, -1)}`}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          {type === 'tasks' && (
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="due-date-input"
              title="Due date"
            />
          )}
          <button onClick={handleAdd}>Add</button>
        </div>
        <ul className="item-list">
          {type === 'people' ? (
            data.people.map((person, idx) => (
              <li key={idx}>
                {editingPersonIdx === idx ? (
                  <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                    <input value={editingPersonName} onChange={e => setEditingPersonName(e.target.value)} />
                    <button onClick={() => {
                      const newName = editingPersonName.trim();
                      if (!newName) return;
                      const oldName = data.people[idx].name;
                      setData(prev => ({
                        ...prev,
                        people: prev.people.map((p, i) => i === idx ? { ...p, name: newName } : p),
                        tasks: prev.tasks.map(t => ({
                          ...t,
                          people: (t.people || []).map(tp => tp.name === oldName ? { ...tp, name: newName } : tp)
                        }))
                      }));
                      setEditingPersonIdx(null);
                      setEditingPersonName('');
                    }}>Save</button>
                    <button onClick={() => { setEditingPersonIdx(null); setEditingPersonName(''); }}>Cancel</button>
                  </div>
                ) : (
                  <div className="person-chip">
                    <strong className="person-name" style={{cursor: 'pointer'}} onClick={() => { setEditingPersonIdx(idx); setEditingPersonName(person.name); }}>{person.name}</strong>
                    <div className="person-actions">
                      <div className="person-methods-inline">
                        <button className={person.methods.discord ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonDefault(idx, 'discord')} title="Discord">
                          <img className="service-icon discord-icon" src={assetUrl(logoDiscord)} alt="discord" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                        </button>
                        <button className={person.methods.sms ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonDefault(idx, 'sms')} title="SMS">
                          <img className="service-icon sms-icon" src={assetUrl(logoSms)} alt="sms" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                        </button>
                        <button className={person.methods.whatsapp ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonDefault(idx, 'whatsapp')} title="WhatsApp">
                          <img className="service-icon whatsapp-icon" src={assetUrl(logoWhatsapp)} alt="whatsapp" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                        </button>
                      </div>
                      <button className="delete" onClick={() => handleDelete(idx)} aria-label="Delete person"><span className="material-icons">close</span></button>
                    </div>
                  </div>
                )}
              </li>
            ))
          ) : (
            data[type].map((item, idx) => (
              <li key={idx} className={`${item.done ? 'done' : ''}${type === 'tasks' && editorTaskIdx === idx ? ' editing' : ''}`}>
                {type === 'tasks' && (
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => handleToggle(idx)}
                    className="task-checkbox"
                    title={item.done ? 'Mark as incomplete' : 'Mark as complete'}
                  />
                )}
                <span
                  className="task-title"
                  onClick={() => type === 'tasks' ? setEditorTaskIdx(idx) : undefined}
                  style={{ cursor: type === 'tasks' ? 'pointer' : 'default', textDecoration: item.done ? 'line-through' : undefined }}
                >
                  {item.text}
                </span>
                {type === 'tasks' && (
                  <>
                    {item.dueDate && (
                      <span className="due-date"><span className="material-icons" style={{verticalAlign: 'middle', fontSize: '1rem', marginRight:6}}>event</span>{item.dueDate}</span>
                    )}

                    {/* show people assigned to this task */}
                    {(item.people || []).length > 0 && (
                      <div className="task-people" title={(item.people || []).map(p => p.name).join(', ')}>
                        {/* show up to two avatar initials and a +N badge */}
                        {((item.people || []).slice(0,2)).map(p => (
                          <div key={p.name} className="avatar small">{p.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div>
                        ))}
                        {(item.people || []).length > 2 && (
                          <div className="people-count">+{(item.people || []).length - 2}</div>
                        )}
                      </div>
                    )}

                    <button
                      className={item.favorite ? 'star favorite' : 'star'}
                      title={item.favorite ? 'Unstar' : 'Star'}
                      onClick={() => handleStar(idx)}
                      aria-label={item.favorite ? 'Unstar' : 'Star'}
                    >
                      <span className="material-icons">{item.favorite ? 'star' : 'star_border'}</span>
                    </button>
                  </>
                )}
                <button className="delete" onClick={() => handleDelete(idx)} aria-label="Delete"><span className="material-icons">close</span></button>
              </li>
            ))
          )}
        </ul>
      </div>
      {editorTaskIdx !== null && type === 'tasks' && (
        <TaskEditor
          key={editorTaskIdx}
          task={data.tasks[editorTaskIdx]}
          onSave={handleEditorSave}
          onUpdateTask={handleEditorUpdate}
          onClose={handleEditorClose}
          allPeople={data.people || []}
          onOpenPeople={() => setType('people')}
          onCreatePerson={(person) => setData(prev => {
            if (prev.people.find(p => p.name === person.name)) return prev;
            return { ...prev, people: [...prev.people, { name: person.name, methods: person.methods || { discord: false, sms: false, whatsapp: false } }] };
          })}
        />
      )}
      {/* dev-only visual icon status (temporary) */}
      <div style={{position: 'fixed', right: 12, bottom: 12, background: '#fff', border: '1px solid #eee', padding: 10, borderRadius: 8, zIndex: 2000, fontSize: 12}} aria-hidden>
        <div style={{fontWeight:700, marginBottom:6}}>Icon status</div>
        {iconStatus.length === 0 ? (
          <div style={{color:'#777'}}>no service icons found</div>
        ) : (
          iconStatus.map((s, i) => (
            <div key={`${String(s.src)}-${i}`} style={{display:'flex', justifyContent:'space-between', gap:8, alignItems:'center'}}>
              <div style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{String(s.src).split('/').pop()}</div>
              <div style={{color: s.naturalWidth ? '#0a0' : '#c33'}}>{s.naturalWidth ? `loaded (${s.naturalWidth}px)` : 'broken'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import TaskEditor from './TaskModal';
import TaskList from './TaskList';
import SmartImage from './SmartImage';


// Use public/assets/ for all static assets



import './App.css';
import logoAsset from './assets/logo_fomo.png';

// asset helpers moved to a module so we can unit-test and reuse them
const { assetUrl, resolveAsset } = require('./utils/assetResolver');

// Compute a reliable logo URL. Prefer the resolved import (works with Parcel/webpack),
// fall back to import.meta.url resolution only if the import didn't produce a usable URL.
const logoUrl = (() => {
  const resolvedImport = resolveAsset(assetUrl(logoAsset));

  // expose debug values temporarily so headless/browser checks can inspect them
  if (typeof window !== 'undefined') {
    window.__RAW_LOGO_ASSET = logoAsset;
    try { window.__ASSET_URL = assetUrl(logoAsset); } catch (_) { window.__ASSET_URL = null; }
    try { window.__RESOLVED_LOGO = resolvedImport; } catch (_) { window.__RESOLVED_LOGO = null; }
  }

  // only accept the resolved import if it looks like a real image URL/string
  if (typeof resolvedImport === 'string' && /\.(png|jpe?g|svg|gif|webp)(\?.*)?$/i.test(resolvedImport)) {
    return resolvedImport;
  }

  // try to read Parcel's importmap (dev server) for the hashed asset path
  try {
    if (typeof document !== 'undefined') {
      const im = document.querySelector('script[type="importmap"]');
      if (im && im.textContent) {
        const jm = JSON.parse(im.textContent);
        const found = Object.values(jm.imports || {}).find(v => typeof v === 'string' && v.includes('logo_fomo'));
        if (found) return found;
      }
    }
  } catch (e) {
    /* ignore */
  }

  // fallback to resolving relative to this module (best-effort)
  try {
    return new URL('./assets/logo_fomo.png', import.meta.url).href;
  } catch (err) {
    return '';
  }
})();

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

  const handleSavePersonEdit = (idx, newName) => {
    const name = (newName || '').trim();
    if (!name) return;
    const oldName = data.people[idx].name;
    setData(prev => ({
      ...prev,
      people: prev.people.map((p, i) => i === idx ? { ...p, name } : p),
      tasks: prev.tasks.map(t => ({
        ...t,
        people: (t.people || []).map(tp => tp.name === oldName ? { ...tp, name } : tp)
      }))
    }));
    setEditingPersonIdx(null);
    setEditingPersonName('');
  };

  return (
    <div className="main-layout">
      <div className="container">
        <div className="logo-splash" aria-hidden="true" style={{ backgroundImage: `url(${logoUrl})` }} />
        <div className="app-bar">
          {/* header icon removed — splash art now serves as the primary brand artwork */}
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

        {type === 'people' ? (
          /* use the same people-list UI as the task editor */
          <div className="people-list task-person-list">
            <div className="task-person-list-header" aria-hidden>
              <div className="task-person-col name">Name</div>
              <div className="task-person-col methods">Methods</div>
            </div>
            {data.people.map((person, idx) => (
              <Person
                key={idx}
                person={person}
                idx={idx}
                editingPersonIdx={editingPersonIdx}
                editingPersonName={editingPersonName}
                setEditingPersonIdx={setEditingPersonIdx}
                setEditingPersonName={setEditingPersonName}
                onSaveEdit={handleSavePersonEdit}
                onCancelEdit={() => { setEditingPersonIdx(null); setEditingPersonName(''); }}
                handleTogglePersonDefault={handleTogglePersonDefault}
                handleDelete={handleDelete}
                asRow={true}
              />
            ))}
          </div>
        ) : (
          <ul className="item-list">
            <TaskList
              items={data[type]}
              type={type}
              editorTaskIdx={editorTaskIdx}
              setEditorTaskIdx={setEditorTaskIdx}
              handleToggle={handleToggle}
              handleStar={handleStar}
              handleDelete={handleDelete}
            />
          </ul>
        )}
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
    </div>
  );
}

export default App;


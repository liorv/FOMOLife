import React, { useState, useEffect } from 'react';
import TaskEditor from './TaskModal';


// Use public/assets/ for all static assets



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
          <img src="/assets/logo_fomo.jpg" alt="FOMO Life logo" className="app-logo" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
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
            <PersonList
              people={data.people}
              editingPersonIdx={editingPersonIdx}
              editingPersonName={editingPersonName}
              setEditingPersonIdx={setEditingPersonIdx}
              setEditingPersonName={setEditingPersonName}
              onSaveEdit={handleSavePersonEdit}
              onCancelEdit={() => { setEditingPersonIdx(null); setEditingPersonName(''); }}
              handleTogglePersonDefault={handleTogglePersonDefault}
              handleDelete={handleDelete}
            />
          ) : (
            <TaskList
              items={data[type]}
              type={type}
              editorTaskIdx={editorTaskIdx}
              setEditorTaskIdx={setEditorTaskIdx}
              handleToggle={handleToggle}
              handleStar={handleStar}
              handleDelete={handleDelete}
            />
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
    </div>
  );
}

export default App;

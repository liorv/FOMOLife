import React, { useState, useEffect, useRef } from 'react';
import TaskEditor from './TaskModal';
import TaskList from './TaskList';
import TabNav from './components/TabNav';
import AddBar from './components/AddBar';
// PeopleSection has been replaced by TaskList for consistency


// all static images live in public/assets

const logoUrl = '/assets/logo_fomo.png';


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
  // avoid reading localStorage during render so server & client markup match
  const [data, setData] = useState({ tasks: [], projects: [], dreams: [], people: [] });
  const initializedRef = useRef(false);

  // client-only hydration of persisted data
  useEffect(() => {
    setData(loadData());
    initializedRef.current = true;
  }, []);

  const [input, setInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState('tasks');

  const [editorTaskIdx, setEditorTaskIdx] = useState(null);
  const [editingPersonIdx, setEditingPersonIdx] = useState(null);
  const [editingPersonName, setEditingPersonName] = useState('');



  useEffect(() => {
    if (initializedRef.current) {
      saveData(data);
    }
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

    // for tasks (or other lists) we also need to keep the editor index in sync
    if (type === 'tasks') {
      setEditorTaskIdx(prev => {
        if (prev === null) return null;
        if (prev === idx) return null; // deleted the task currently open
        if (prev > idx) return prev - 1; // shift down after removal
        return prev;
      });
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
        <TabNav active={type} onChange={setType} />
        <AddBar
          type={type}
          input={input}
          dueDate={dueDate}
          onInputChange={setInput}
          onDueDateChange={setDueDate}
          onAdd={handleAdd}
        />

        {type === 'people' ? (
          <div className="people-list task-person-list">
            <div className="task-person-list-header" aria-hidden>
              <div className="task-person-col name">Name</div>
              <div className="task-person-col methods">Methods</div>
            </div>
            <TaskList
              items={data.people}
              type="people"
              editingPersonIdx={editingPersonIdx}
              editingPersonName={editingPersonName}
              setEditingPersonIdx={setEditingPersonIdx}
              setEditingPersonName={setEditingPersonName}
              onSaveEdit={handleSavePersonEdit}
              onCancelEdit={() => { setEditingPersonIdx(null); setEditingPersonName(''); }}
              handleTogglePersonDefault={handleTogglePersonDefault}
              handleDelete={handleDelete}
            />
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


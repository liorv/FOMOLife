import React, { useState, useEffect, useRef } from 'react';
import TaskList from './TaskList';
import TabNav from './components/TabNav';
import AddBar from './components/AddBar';
// persistence API; currently backed by localStorage or file but will
// eventually become a network service capable of scaling to many users.
import * as db from './api/db';
// PeopleSection has been replaced by TaskList for consistency


// all static images live in public/assets

const logoUrl = '/assets/logo_fomo.png';


// the legacy storage helpers are no longer used directly; all
// operations go through `src/api/db.js` which itself wraps the
// storage layer.  this makes it easy to replace the implementation with
// a network service in the future.


function App({ userId } = {}) {
  // avoid accessing the persistence layer during render so server & client
  // markup match.  loadData is synchronous today but may become async
  // later, so we keep it in an effect the same way we did with
  // `localStorage` previously.
  const [data, setData] = useState({ tasks: [], projects: [], dreams: [], people: [] });
  const initializedRef = useRef(false);

  // client-only hydration of persisted data.  we call the async db
  // helper so that identifiers can be added and the same API can be
  // swapped out for a remote backend later.
  useEffect(() => {
    (async () => {
      const loaded = await db.loadData(userId);
      setData(loaded);
      initializedRef.current = true;
    })();
  }, []);

  const [input, setInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState('tasks');

  const [editorTaskId, setEditorTaskId] = useState(null);
  // helper which toggles the editor open/closed when the same task is clicked
  const handleSetEditorId = (id) => {
    setEditorTaskId(prev => prev === id ? null : id);
  };
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [editingPersonName, setEditingPersonName] = useState('');



  // The old "save-on-every-change" effect is no longer strictly
  // necessary since each handler uses the async db API directly.  We
  // retain it as a safety net in case something mutates `data` outside
  // of the helpers.
  useEffect(() => {
    if (initializedRef.current) {
      // don't await; this is just a best-effort write-through
      db.saveData && db.saveData(data, userId);
    }
  }, [data]);

  const handleAdd = async () => {
    if (!input.trim()) return;
    if (type === 'tasks') {
      const newTask = await db.create('tasks', {
        text: input,
        done: false,
        dueDate: dueDate || null,
        favorite: false,
        people: [],
      }, userId);
      setData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
      setDueDate('');
    } else if (type === 'people') {
      const name = input.trim();
      // dedupe by name; this is still done purely in-memory because the
      // db mock doesn't support querying.  a real backend would enforce
      // uniqueness server‑side.
      if (!data.people.find(p => p.name === name)) {
        const newPerson = await db.create('people', { name, methods: { discord: false, sms: false, whatsapp: false } }, userId);
        setData(prev => ({ ...prev, people: [...prev.people, newPerson] }));
      }
    } else {
      const newItem = await db.create(type, { text: input, done: false }, userId);
      setData(prev => ({ ...prev, [type]: [...prev[type], newItem] }));
    }
    setInput('');
  };

  const handleToggle = async (id) => {
    const item = data[type].find(i => i.id === id);
    if (!item) return;
    const updated = { ...item, done: !item.done };
    await db.update(type, id, { done: !item.done }, userId);
    setData(prev => ({
      ...prev,
      [type]: prev[type].map(i => i.id === id ? updated : i),
    }));
  };

  const handleDelete = async (id) => {
    if (type === 'people') {
      const person = data.people.find(p => p.id === id);
      if (!person) return;
      await db.remove('people', id, userId);
      setData(prev => ({
        ...prev,
        people: prev.people.filter(p => p.id !== id),
        tasks: prev.tasks.map(t => ({
          ...t,
          people: (t.people || []).filter(p => p.name !== person.name),
        })),
      }));
      return;
    }

    if (type === 'tasks') {
      setEditorTaskId(prev => (prev === id ? null : prev));
    }

    await db.remove(type, id, userId);
    setData(prev => ({
      ...prev,
      [type]: prev[type].filter(i => i.id !== id),
    }));
  };

  const handleStar = async (id) => {
    if (type !== 'tasks') return;
    const task = data.tasks.find(t => t.id === id);
    if (!task) return;
    const updated = { ...task, favorite: !task.favorite };
    await db.update('tasks', id, { favorite: !task.favorite }, userId);
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? updated : t),
    }));
  };

  const handleTogglePersonDefault = async (id, method) => {
    const person = data.people.find(p => p.id === id);
    if (!person) return;
    const newMethods = { ...person.methods, [method]: !person.methods[method] };
    await db.update('people', id, { methods: newMethods }, userId);
    setData(prev => ({
      ...prev,
      people: prev.people.map(p => p.id === id ? { ...p, methods: newMethods } : p),
      tasks: prev.tasks.map(t => ({
        ...t,
        people: (t.people || []).map(tp => tp.name === person.name ? { ...tp, methods: { ...tp.methods, [method]: !person.methods[method] } } : tp),
      })),
    }));
  };

  const handleEditorSave = async (updatedTask) => {
    if (!editorTaskId) return;
    await db.update('tasks', editorTaskId, updatedTask, userId);
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === editorTaskId ? { ...t, ...updatedTask } : t),
    }));
    setEditorTaskId(null);
  };

  // persist changes from editor without closing it (used for autosave / unmount)
  const handleEditorUpdate = async (updatedTask) => {
    if (!editorTaskId) return;
    // persist immediately but also update state for fast UI feedback
    await db.update('tasks', editorTaskId, updatedTask, userId);
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === editorTaskId ? { ...t, ...updatedTask } : t),
    }));
  };

  const handleEditorClose = () => setEditorTaskId(null);

  const handleSavePersonEdit = async (id, newName) => {
    const name = (newName || '').trim();
    if (!name) return;
    const person = data.people.find(p => p.id === id);
    if (!person) return;
    const oldName = person.name;
    await db.update('people', id, { name }, userId);
    setData(prev => ({
      ...prev,
      people: prev.people.map(p => p.id === id ? { ...p, name } : p),
      tasks: prev.tasks.map(t => ({
        ...t,
        people: (t.people || []).map(tp => tp.name === oldName ? { ...tp, name } : tp),
      })),
    }));
    setEditingPersonId(null);
    setEditingPersonName('');
  };

  return (
    <div className="main-layout">
      {/* outer wrapper holds the top bar and container and fills available vertical space */}
      <div className="app-outer">
        {/* title bar containing the logo */}
        <div className="title-bar">
          <img src={logoUrl} alt="FOMO logo" className="title-logo" />
        </div>
        <div className="container">
          {/* decorative splash removed; logo now shown in title bar */}

        {type === 'people' ? (
          <div className="people-list task-person-list">
            <div className="task-person-list-header" aria-hidden>
              <div className="task-person-col name">Name</div>
              <div className="task-person-col methods">Notifications</div>
            </div>
                  <TaskList
              items={data.people}
              type="people"
              editingPersonId={editingPersonId}
              editingPersonName={editingPersonName}
              setEditingPersonId={setEditingPersonId}
              setEditingPersonName={setEditingPersonName}
              onSaveEdit={handleSavePersonEdit}
              onCancelEdit={() => { setEditingPersonId(null); setEditingPersonName(''); }}
              handleTogglePersonDefault={handleTogglePersonDefault}
              handleDelete={handleDelete}
            />
          </div>
        ) : (
          <ul className="item-list">
            <TaskList
              items={data[type]}
              type={type}
              editorTaskId={editorTaskId}
              setEditorTaskId={handleSetEditorId}
              handleToggle={handleToggle}
              handleStar={handleStar}
              handleDelete={handleDelete}
              onEditorSave={handleEditorSave}
              onEditorUpdate={handleEditorUpdate}
              onEditorClose={handleEditorClose}
              allPeople={data.people || []}
              onOpenPeople={() => setType('people')}
              onCreatePerson={async (person) => {
                // avoid dupes
                if (data.people.find(p => p.name === person.name)) return;
                const newPerson = await db.create('people', { name: person.name, methods: person.methods || { discord: false, sms: false, whatsapp: false } }, userId);
                setData(prev => ({ ...prev, people: [...prev.people, newPerson] }));
                return newPerson;
              }}
            />
          </ul>
        )}
        </div>
      </div>
      {/* bottom‐aligned add bar; replicates original AddBar controls */}
      <div className="bottom-input-bar">
        <AddBar
          type={type}
          input={input}
          dueDate={dueDate}
          onInputChange={setInput}
          onDueDateChange={setDueDate}
          onAdd={handleAdd}
        />
      </div>
      <TabNav active={type} onChange={setType} />
    </div>
  );
}

export default App;


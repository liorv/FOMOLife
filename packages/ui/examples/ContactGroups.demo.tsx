import React from "react";
import { ContactTile } from "../ContactTile";

export default function ContactGroupsDemo() {
  // Initial groups and contacts for demo
  const [groups, setGroups] = React.useState([
    { id: "g1", name: "Family", contactIds: ["c1"] },
    { id: "g2", name: "Work", contactIds: ["c2"] },
    { id: "g3", name: "Friends", contactIds: [] },
  ]);
  const [contacts, setContacts] = React.useState([
    { id: "c1", name: "Alice Example", status: "linked", avatarUrl: null },
    { id: "c2", name: "Bob NotLinked", status: "not_linked", avatarUrl: null },
    { id: "c3", name: "Charlie Pending", status: "link_pending", avatarUrl: null },
  ]);

  // Handler to add a contact to a group
  function addContactToGroup(groupId: string, contactId: string) {
    setGroups(gs => gs.map(g =>
      g.id === groupId && !g.contactIds.includes(contactId)
        ? { ...g, contactIds: [...g.contactIds, contactId] }
        : g
    ));
  }

  // Handler to remove a contact from a group
  function removeContactFromGroup(groupId: string, contactId: string) {
    setGroups(gs => gs.map(g =>
      g.id === groupId
        ? { ...g, contactIds: g.contactIds.filter(cid => cid !== contactId) }
        : g
    ));
  }

  // Drag-and-drop handlers
  const [draggedContactId, setDraggedContactId] = React.useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = React.useState<string | null>(null);

  return (
    <div style={{ padding: 32, background: '#f5f5f5', minHeight: '100vh' }}>
      <h2>Contact Groups Demo</h2>
      <div style={{ display: 'flex', gap: 32 }}>
        {groups.map((group, groupIdx) => (
          <div
            key={group.id}
            style={{
              minWidth: 220,
              background: dragOverGroupId === group.id ? '#e3f2fd' : '#fff',
              borderRadius: 10,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              padding: 16,
              transition: 'background 0.15s',
            }}
            onDragOver={e => {
              if (draggedContactId && !group.contactIds.includes(draggedContactId)) {
                e.preventDefault();
                setDragOverGroupId(group.id);
              }
            }}
            onDragLeave={e => {
              setDragOverGroupId(null);
            }}
            onDrop={e => {
              if (draggedContactId && !group.contactIds.includes(draggedContactId)) {
                addContactToGroup(group.id, draggedContactId);
                // Remove from other groups
                setGroups(gs => gs.map(g =>
                  g.id !== group.id && g.contactIds.includes(draggedContactId)
                    ? { ...g, contactIds: g.contactIds.filter(cid => cid !== draggedContactId) }
                    : g
                ));
                setDraggedContactId(null);
                setDragOverGroupId(null);
              }
            }}
          >
            {/* Editable group name */}
            <input
              style={{
                fontWeight: 600,
                fontSize: 18,
                marginBottom: 12,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
              }}
              value={group.name}
              onChange={e => {
                const newName = e.target.value;
                setGroups(gs => gs.map((g, i) => i === groupIdx ? { ...g, name: newName } : g));
              }}
            />
            {group.contactIds.length === 0 && <div style={{ color: '#bbb', fontSize: 14 }}>No contacts</div>}
            {group.contactIds.map(cid => {
              const c = contacts.find(c => c.id === cid);
              return c ? (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                  <ContactTile
                    id={c.id}
                    name={c.name}
                    status={c.status as any}
                    avatarUrl={c.avatarUrl}
                  />
                  <button
                    style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px', borderRadius: 4, border: 'none', background: '#eee', cursor: 'pointer' }}
                    onClick={() => removeContactFromGroup(group.id, c.id)}
                  >Remove</button>
                </div>
              ) : null;
            })}
            {/* Add contact to group UI */}
          <div
            key={group.id}
            style={{ minWidth: 220, background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 16 }}
            onDragOver={e => {
              if (draggedContactId && !group.contactIds.includes(draggedContactId)) {
                e.preventDefault();
              }
            }}
            onDrop={e => {
              if (draggedContactId && !group.contactIds.includes(draggedContactId)) {
                addContactToGroup(group.id, draggedContactId);
                // Remove from other groups
                setGroups(gs => gs.map(g =>
                  g.id !== group.id && g.contactIds.includes(draggedContactId)
                    ? { ...g, contactIds: g.contactIds.filter(cid => cid !== draggedContactId) }
                    : g
                ));
                setDraggedContactId(null);
              }
            }}
          >
              <select
                defaultValue=""
                onChange={e => {
                  if (e.target.value) {
                    addContactToGroup(group.id, e.target.value);
                    e.target.value = "";
                  }
                }}
                style={{ fontSize: 13, padding: '2px 8px', borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="" disabled>Add contact...</option>
                {contacts.filter(c => !group.contactIds.includes(c.id)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

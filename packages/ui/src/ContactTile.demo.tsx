import React from "react";
import { ContactTile } from "./ContactTile";

export default function ContactTileDemo() {
  const [contacts, setContacts] = React.useState([
    { id: "c1", name: "Alice Example", status: "linked", avatarUrl: null },
    { id: "c2", name: "Bob NotLinked", status: "not_linked", avatarUrl: null },
    { id: "c3", name: "Charlie Pending", status: "link_pending", avatarUrl: null },
  ]);

  function handleNameChange(idx: number, newName: string) {
    setContacts(cs => cs.map((c, i) => i === idx ? { ...c, name: newName } : c));
  }

  function handleUnlink(idx: number) {
    setContacts(cs => cs.map((c, i) => i === idx ? { ...c, status: "not_linked" } : c));
  }

  function handleLink(idx: number) {
    setContacts(cs => cs.map((c, i) => i === idx ? { ...c, status: "link_pending" } : c));
  }


  return (
    <div style={{ padding: 32, background: '#f5f5f5', minHeight: '100vh' }}>
      <h2>ContactTile Demo</h2>
      {contacts.map((c, idx) => (
        <ContactTile
          key={c.id}
          id={c.id}
          name={c.name}
          status={c.status as any}
          avatarUrl={c.avatarUrl}
          onNameChange={newName => handleNameChange(idx, newName)}
          onUnlink={() => handleUnlink(idx)}
          onLink={() => handleLink(idx)}
        />
      ))}
      <h3>New contact auto-focus example</h3>
      <ContactTile
        id="new"
        name="New contact"
        status="link_pending"
        autoFocus
        onNameChange={n => console.log('edited new name', n)}
      />
    </div>
  );
}

import React from 'react';
import Person from '../Person';

export default function PeopleSection({
  people,
  editingPersonIdx,
  editingPersonName,
  setEditingPersonIdx,
  setEditingPersonName,
  onSaveEdit,
  onCancelEdit,
  handleTogglePersonDefault,
  handleDelete,
}) {
  return (
    <div className="people-list task-person-list">
      <div className="task-person-list-header" aria-hidden>
        <div className="task-person-col name">Name</div>
        <div className="task-person-col methods">Methods</div>
      </div>
      {people.map((person, idx) => (
        <Person
          key={idx}
          person={person}
          idx={idx}
          editingPersonIdx={editingPersonIdx}
          editingPersonName={editingPersonName}
          setEditingPersonIdx={setEditingPersonIdx}
          setEditingPersonName={setEditingPersonName}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          handleTogglePersonDefault={handleTogglePersonDefault}
          handleDelete={handleDelete}
          asRow={true}
        />
      ))}
    </div>
  );
}

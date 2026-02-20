import React from 'react';
import Person from './Person';

export default function PersonList({ people = [], editingPersonIdx, editingPersonName, setEditingPersonIdx, setEditingPersonName, onSaveEdit, onCancelEdit, handleTogglePersonDefault, handleDelete }) {
  return (
    <>
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
        />
      ))}
    </>
  );
}

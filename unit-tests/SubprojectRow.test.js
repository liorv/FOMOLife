import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SubprojectRow from '../src/components/SubprojectRow';

const baseSub = {
  id: 'sub1',
  text: 'My Sub',
  tasks: [
    { id: 't1', done: true },
    { id: 't2', done: false },
  ],
  description: '',
  owners: [],
};

describe('SubprojectRow', () => {
  test('displays title, icon, count and percent complete', () => {
    render(
      <SubprojectRow sub={baseSub} onEdit={jest.fn()} />
    );
    expect(screen.getByText('My Sub')).toBeInTheDocument();
    // folder icon should appear
    expect(document.querySelector('.subproject-icon')).toBeTruthy();
    // check for stats more flexibly to handle whitespace
    const stats = document.querySelector('.subproject-row-stats');
    expect(stats.textContent).toContain('2');
    expect(stats.textContent).toContain('50%');
  });

  test('shows description icon when description present', () => {
    const sub = { ...baseSub, description: 'hello' };
    render(<SubprojectRow sub={sub} onEdit={jest.fn()} />);
    expect(screen.getByTitle('Has description')).toBeInTheDocument();
  });

  test('renders owner avatars and overflow count', () => {
    const owners = [
      { name: 'Alice Smith' },
      { name: 'Bob Jones' },
      { name: 'Cara' },
    ];
    const sub = { ...baseSub, owners };
    render(<SubprojectRow sub={sub} onEdit={jest.fn()} />);
    // two avatars and one '+1' indicator
    const avatars = document.querySelectorAll('.subproject-row .avatar');
    expect(avatars.length).toBe(2);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  test('menu button opens options and edit choice calls callback', () => {
    const onEdit = jest.fn();
    render(<SubprojectRow sub={baseSub} onEdit={onEdit} />);
    fireEvent.click(document.querySelector('.subproject-row .menu-button'));
    // menu should appear
    expect(document.querySelector('.project-menu-dropdown')).toBeTruthy();
    const editItem = document.querySelector('.project-menu-dropdown .edit-menu-item');
    expect(editItem.textContent).toContain('Edit');
    expect(editItem.querySelector('.material-icons')).toBeTruthy();
    fireEvent.click(editItem);
    expect(onEdit).toHaveBeenCalledWith('sub1');
  });

  test('delete option present and calls onDelete', () => {
    const onDelete = jest.fn();
    render(<SubprojectRow sub={baseSub} onEdit={jest.fn()} onDelete={onDelete} />);
    fireEvent.click(document.querySelector('.subproject-row .menu-button'));
    const deleteItem = document.querySelector('.project-menu-dropdown .delete-menu-item');
    expect(deleteItem.textContent).toContain('Delete');
    expect(deleteItem.querySelector('.material-icons')).toBeTruthy();
    fireEvent.click(deleteItem);
    expect(onDelete).toHaveBeenCalledWith('sub1');
  });

});

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
    expect(screen.getByText('2 tasks (50%)')).toBeInTheDocument();
  });

  test('shows description icon when description present', () => {
    const sub = { ...baseSub, description: 'hello' };
    render(<SubprojectRow sub={sub} onEdit={jest.fn()} onDelete={jest.fn()} />);
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

  test('edit button calls callback with id', () => {
    const onEdit = jest.fn();
    render(<SubprojectRow sub={baseSub} onEdit={onEdit} />);
    fireEvent.click(document.querySelector('.subproject-row .edit'));
    expect(onEdit).toHaveBeenCalledWith('sub1');
  });
});

/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TasksPage from '../TasksPage';
import type { TaskItem } from '@myorg/types';

// mock next/navigation hooks used by the page
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('../../lib/client/tasksApi', () => ({
  createTasksApiClient: () => ({
    listTasks: jest.fn().mockResolvedValue([]),
    createTask: jest.fn().mockImplementation(async (data) => ({
      id: 't1',
      text: data.text,
      favorite: data.favorite || false,
      description: data.description || '',
    })),
    updateTask: jest.fn().mockResolvedValue(undefined),
    deleteTask: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('TasksPage', () => {
  it('renders loading then allows adding tasks', async () => {
    render(<TasksPage canManage={true} />);
    expect(screen.getByText('Loading tasks…')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('Loading tasks…')).not.toBeInTheDocument());

    const input = screen.getByPlaceholderText('Add a new task (press Enter)');

    // pressing enter with empty input should do nothing
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Buy milk' } });
    // press enter to add
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('Buy milk')).toBeInTheDocument());
  });
});

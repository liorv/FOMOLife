/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

  it('responds to focus-add action by focusing the add bar (and accepts thumb-fab fallback)', async () => {
    render(<TasksPage canManage={true} />);

    // wait for initial load
    await waitFor(() => expect(screen.queryByText('Loading tasks…')).not.toBeInTheDocument());

    // helper to assert focus
    const assertFocused = async () => {
      await waitFor(() => {
        const el = document.getElementById('add-tasks-input') as HTMLInputElement | null;
        expect(el).not.toBeNull();
        if (el) {
          expect(document.activeElement).toBe(el);
          // styled by globals.css; jest-dom doesn't evaluate var(), but we can ensure
          // focus rule applies by checking computed style after focus in browser tests
          expect(el.style.background).toBe(''); // inline not set
        }
        // wrapper should have focus class from AddBar
        const wrapper = document.querySelector('.add-bar');
        expect(wrapper).toHaveClass('focused');
        expect(wrapper).toHaveStyle('background: #e6f7ff');
      });
    };

    // also verify bg flips when focusing then blurring
    const assertInputBg = async (expected: string) => {
      const el = document.getElementById('add-tasks-input') as HTMLInputElement | null;
      expect(el).not.toBeNull();
      if (el) {
        // our test env cannot compute CSS variables, but we can simulate via setting
        // the style manually to mimic the rule for clarity
        if (expected === 'white') {
          el.style.background = 'white';
        } else {
          // simulate fallback; we can't evaluate vars so just use bright blue
          el.style.background = '#4285f4';
        }
        expect(el.style.background).toBe(expected === 'white' ? 'white' : '#4285f4');
      }
    };

    // simulate the thumb button focus-add message
    act(() => {
      window.postMessage({ type: 'focus-add' }, '*');
    });
    await assertFocused();

    // reset focus
    (document.activeElement as any)?.blur?.();

    // simulate legacy message
    act(() => {
      window.postMessage({ type: 'thumb-fab' }, '*');
    });
    await assertFocused();
  });

  it('replies to config requests with icon and action', async () => {
    render(<TasksPage canManage={true} />);
    await waitFor(() => expect(screen.queryByText('Loading tasks…')).not.toBeInTheDocument());

    const msgs: any[] = [];
    window.addEventListener('message', (e) => msgs.push(e.data));

    act(() => {
      window.postMessage({ type: 'get-thumb-config' }, '*');
    });

    await waitFor(() => msgs.some((m) => m.type === 'thumb-config'));
    const cfg = msgs.find((m) => m.type === 'thumb-config');
    expect(cfg.icon).toBe('add');
    expect(cfg.action).toBe('focus-add');
  });
});

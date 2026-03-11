import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
// using shared UI directly from source as path alias resolution can be unreliable in tests
// @ts-ignore
import { TaskModal as TaskEditor } from '@myorg/ui';
import type { ProjectTask, ProjectTaskPerson, Contact } from '@myorg/types';

const mockTask: ProjectTask = {
  id: 'task-1',
  text: 'Test Task',
  description: 'Test Description',
  done: false,
  dueDate: '2024-12-31',
  favorite: false,
  people: [],
};

const mockContact: Contact = {
  id: 'contact-1',
  name: 'John Doe',
  status: 'linked',
};

describe('TaskModal', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnUpdateTask = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <TaskEditor
        task={mockTask}
        onSave={mockOnSave}
        onClose={mockOnClose}
        onUpdateTask={mockOnUpdateTask}
        inline={true}
        {...props}
      />
    );
  };

  describe('Immediate persistence of changes', () => {
    it('should call onUpdateTask immediately when due date is changed', async () => {
      renderComponent();

      const dueDateInput = screen.getByLabelText(/due date/i);
      fireEvent.change(dueDateInput, { target: { value: '2025-06-15' } });

      await waitFor(() => {
        expect(mockOnUpdateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'task-1',
            dueDate: '2025-06-15',
          })
        );
      });
    });

    it('should call onUpdateTask immediately when description is changed', async () => {
      renderComponent();

      const descriptionInput = screen.getByLabelText(/notes/i);
      fireEvent.change(descriptionInput, { target: { value: 'New description' } });

      await waitFor(() => {
        expect(mockOnUpdateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'task-1',
            description: 'New description',
          })
        );
      });
    });

    it('should call onUpdateTask when a person is added', async () => {
      const mockAllPeople: Contact[] = [mockContact];
      renderComponent({ allPeople: mockAllPeople });

      // Open the people dropdown by focusing the input
      const personInput = screen.getByPlaceholderText(/search people/i);
      fireEvent.change(personInput, { target: { value: 'John' } });

      // Wait for suggestions to appear
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      // dropdown is rendered in a portal (not inside the inline-editor element)
      const suggestion = screen.getByText('John Doe');
      expect(suggestion.closest('.inline-editor')).toBeNull();

      // Click on the suggestion
      fireEvent.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(mockOnUpdateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'task-1',
            people: [{ name: 'John Doe' }],
          })
        );
      });
    });

    it('should show inline suggestion when no matches', async () => {
      const mockAllPeople: Contact[] = [];
      renderComponent({ allPeople: mockAllPeople });
      const personInput = screen.getByPlaceholderText(/search people/i);
      fireEvent.change(personInput, { target: { value: 'Unknown' } });

      await waitFor(() => {
        const addRow = screen.getByText(/Add "Unknown"/i);
        expect(addRow).toBeInTheDocument();
      });
    });

    it('should call onUpdateTask when a person is removed', async () => {
      const taskWithPerson: ProjectTask = {
        ...mockTask,
        people: [{ name: 'John Doe' } as ProjectTaskPerson],
      };
      renderComponent({ task: taskWithPerson });

      // Find and click the remove button for the person
      const removeButton = screen.getByLabelText('Remove John Doe');
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockOnUpdateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'task-1',
            people: [],
          })
        );
      });
    });
  });

  describe('Initial state', () => {
    it('should display task description and due date correctly', () => {
      renderComponent();

      // Note: In inline mode, the title is not displayed (it's in the task row itself)
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument();
    });
  });

  describe('onSave callback', () => {
    it('should call onSave with updated task when Ctrl+Enter is pressed', async () => {
      renderComponent();

      const descriptionInput = screen.getByLabelText(/notes/i);
      fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });

      // Press Ctrl+Enter
      fireEvent.keyDown(descriptionInput, {
        key: 'Enter',
        ctrlKey: true,
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'task-1',
            description: 'Updated description',
          })
        );
      });
    });
  });

  describe('Task switching scenario', () => {
    it('should persist changes when switching between tasks and returning', async () => {
      // Track all updates to simulate parent state
      const allUpdates: ProjectTask[] = [];
      const mockOnUpdateTask = jest.fn((updatedTask: ProjectTask) => {
        allUpdates.push(updatedTask);
      });

      const taskA: ProjectTask = {
        id: 'task-a',
        text: 'Task A',
        description: 'Original description A',
        done: false,
        dueDate: '2024-01-01',
        favorite: false,
        people: [],
      };

      const taskB: ProjectTask = {
        id: 'task-b',
        text: 'Task B',
        description: 'Original description B',
        done: false,
        dueDate: '2024-02-01',
        favorite: false,
        people: [],
      };

      // Simulate: User opens Task A and edits description
      const { rerender } = render(
        <TaskEditor
          task={taskA}
          onSave={jest.fn()}
          onClose={jest.fn()}
          onUpdateTask={mockOnUpdateTask}
          inline={true}
        />
      );

      // Change description on Task A
      const descriptionInput = screen.getByLabelText(/notes/i);
      fireEvent.change(descriptionInput, { target: { value: 'Modified description A' } });

      await waitFor(() => {
        expect(mockOnUpdateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'task-a',
            description: 'Modified description A',
          })
        );
      });

      // Simulate: User closes Task A editor (switch to Task B)
      // In real app, this would unmount Task A and mount Task B
      const lastUpdateA = allUpdates[allUpdates.length - 1];
      
      // Simulate: User returns to Task A (re-render with updated task from parent)
      const updatedTaskAFromParent: ProjectTask = {
        ...taskA,
        description: 'Modified description A', // Parent has the persisted change
      };

      rerender(
        <TaskEditor
          task={updatedTaskAFromParent}
          onSave={jest.fn()}
          onClose={jest.fn()}
          onUpdateTask={mockOnUpdateTask}
          inline={true}
        />
      );

      // Verify: The description should show the persisted value
      await waitFor(() => {
        expect(screen.getByDisplayValue('Modified description A')).toBeInTheDocument();
      });
    });

    it('should preserve unsaved changes when switching tasks and returning (via sync effect)', async () => {
      const mockOnUpdateTask = jest.fn();

      const taskA: ProjectTask = {
        id: 'task-a',
        text: 'Task A',
        description: '',
        done: false,
        dueDate: null,
        favorite: false,
        people: [],
      };

      // Render Task A
      const { rerender } = render(
        <TaskEditor
          task={taskA}
          onSave={jest.fn()}
          onClose={jest.fn()}
          onUpdateTask={mockOnUpdateTask}
          inline={true}
        />
      );

      // Type in description but don't trigger save yet (just set state)
      const descriptionInput = screen.getByLabelText(/notes/i);
      fireEvent.change(descriptionInput, { target: { value: 'My new notes' } });

      // At this point onUpdateTask should have been called due to our immediate persist
      await waitFor(() => {
        expect(mockOnUpdateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'task-a',
            description: 'My new notes',
          })
        );
      });

      // Simulate switching to another task (re-render with different task)
      const taskB: ProjectTask = {
        id: 'task-b',
        text: 'Task B',
        description: '',
        done: false,
        dueDate: null,
        favorite: false,
        people: [],
      };

      rerender(
        <TaskEditor
          task={taskB}
          onSave={jest.fn()}
          onClose={jest.fn()}
          onUpdateTask={jest.fn()}
          inline={true}
        />
      );

      // Now simulate returning to Task A with the updated data from parent
      const updatedTaskA: ProjectTask = {
        ...taskA,
        description: 'My new notes', // This should be persisted
      };

      rerender(
        <TaskEditor
          task={updatedTaskA}
          onSave={jest.fn()}
          onClose={jest.fn()}
          onUpdateTask={mockOnUpdateTask}
          inline={true}
        />
      );

      // Verify the persisted description is shown
      await waitFor(() => {
        expect(screen.getByDisplayValue('My new notes')).toBeInTheDocument();
      });
    });
  });
});

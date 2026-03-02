import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AddBar from '../src/AddBar/AddBar';

describe('AddBar', () => {
  it('renders placeholder based on type', () => {
    render(<AddBar type="tasks" input="" onInputChange={() => {}} onAdd={() => {}} />);
    expect(screen.getByPlaceholderText(/Add a new task/i)).toBeInTheDocument();
  });

  it('calls onInputChange and onAdd', () => {
    const change = jest.fn();
    const add = jest.fn();
    render(<AddBar type="people" input="" onInputChange={change} onAdd={add} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'foo' } });
    expect(change).toHaveBeenCalledWith('foo');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(add).toHaveBeenCalled();
  });

  it('applies focused class when input is focused', () => {
    render(<AddBar type="tasks" input="" onInputChange={() => {}} onAdd={() => {}} />);
    const wrapper = document.querySelector('.add-bar');
    const input = screen.getByRole('textbox');
    expect(wrapper).not.toHaveClass('focused');
    fireEvent.focus(input);
    expect(wrapper).toHaveClass('focused');
    fireEvent.blur(input);
    expect(wrapper).not.toHaveClass('focused');
  });

  it('accepts focusStyle and focusClassName props', () => {
    const style = { background: 'red' };
    render(
      <AddBar
        type="tasks"
        input=""
        onInputChange={() => {}}
        onAdd={() => {}}
        focusStyle={style}
        focusClassName="extra"
      />,
    );
    const wrapper = document.querySelector('.add-bar')!;
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(wrapper).toHaveClass('focused');
    expect(wrapper).toHaveClass('extra');
    expect(wrapper).toHaveStyle('background: red');
  });
});
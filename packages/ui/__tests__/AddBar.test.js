import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import AddBar from '../src/AddBar/AddBar';
describe('AddBar', () => {
    it('renders placeholder based on type', () => {
        render(_jsx(AddBar, { type: "tasks", input: "", onInputChange: () => { }, onAdd: () => { } }));
        expect(screen.getByPlaceholderText(/Add a new task/i)).toBeInTheDocument();
    });
    it('calls onInputChange and onAdd', () => {
        const change = jest.fn();
        const add = jest.fn();
        render(_jsx(AddBar, { type: "people", input: "", onInputChange: change, onAdd: add }));
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'foo' } });
        expect(change).toHaveBeenCalledWith('foo');
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(add).toHaveBeenCalled();
    });
});

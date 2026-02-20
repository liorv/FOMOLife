import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

test('adding a person shows the three service icons with valid src attributes', async () => {
  render(<App />);

  // open People tab
  const peopleTab = screen.getByRole('button', { name: /People/i });
  await userEvent.click(peopleTab);

  // add a person named "pp"
  const addInput = screen.getByPlaceholderText(/Add a new person/i);
  await userEvent.type(addInput, 'pp');
  await userEvent.keyboard('{Enter}');

  // person should appear
  const personName = await screen.findByText('pp');
  expect(personName).toBeInTheDocument();

  // find the person chip and assert it contains 3 service icons
  const chip = personName.closest('.person-chip');
  const imgs = chip.querySelectorAll('img.service-icon');
  expect(imgs.length).toBe(3);

  // ensure each img.src is a string URL (not [object Object])
  const srcs = Array.from(imgs).map(i => i.getAttribute('src'));
  srcs.forEach(s => expect(typeof s).toBe('string'));
});
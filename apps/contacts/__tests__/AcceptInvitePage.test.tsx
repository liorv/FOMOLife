/// <reference types="jest" />
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// helpers lifted from contactsClient.test.ts for response mocking
function makeResponse(ok: boolean, status = ok ? 200 : 500, body: any = {}) {
  return {
    ok,
    status,
    json: async () => body,
  } as Partial<Response>;
}

// we'll mutate this search params object in our tests
let params = new URLSearchParams();
// expose a shared replace mock so tests can assert on navigation
const replaceMock = jest.fn();
// mock next/navigation hooks before importing the component
jest.mock('next/navigation', () => ({
  useSearchParams: () => params,
  useRouter: () => ({ replace: replaceMock }),
}));

// import the real page component via alias so jest resolves it correctly
import AcceptInvitePage from '@/app/accept-invite/page';

describe('AcceptInvitePage component', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    params = new URLSearchParams();
  });

  it('displays invitation when server returns 200', async () => {
    (fetch as jest.Mock).mockResolvedValue(makeResponse(true, 200, { inviterName: 'Alice', contactName: 'Bob' }));

    params.set('token', 'sometoken');
    render(<AcceptInvitePage />);

    await waitFor(() => screen.getByText(/Alice/));
    expect(screen.queryByText(/Invitation not found/)).toBeNull();
  });

  it('clears stale error when token value changes', async () => {
    // first token returns 404, second token returns success
    (fetch as jest.Mock)
      .mockResolvedValueOnce(makeResponse(false, 404, { message: 'Invitation not found or already used' }))
      .mockResolvedValueOnce(makeResponse(true, 200, { inviterName: 'X', contactName: 'Y' }));

    params.set('token', 'first');
    const { rerender } = render(<AcceptInvitePage />);

    await waitFor(() => screen.getByText(/Invitation not found or already used/));
    // update search params and rerender to simulate navigation
    params.set('token', 'second');
    rerender(<AcceptInvitePage />);

    await waitFor(() => screen.getByText(/X/));
    expect(screen.queryByText(/Invitation not found/)).toBeNull();
  });

  it('shows server message when accept fails', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(makeResponse(true, 200, { inviterName: 'Joe', contactName: 'Jen' }))
      .mockResolvedValueOnce(makeResponse(false, 400, { error: 'self_invite', message: 'You cannot accept your own invitation.' }));

    params.set('token', 'tok');
    render(<AcceptInvitePage />);
    await waitFor(() => screen.getByText(/Joe/));
    const accept = screen.getByText('Accept');
    accept.click();
    await waitFor(() => screen.getByText(/You cannot accept your own invitation/));
  });

  it('displays notice if the link belongs to the current user', async () => {
    // use a different contactName to guard against the previous bug where
    // selfInvite was calculated incorrectly when the name didn't match.
    (fetch as jest.Mock).mockResolvedValue(makeResponse(true, 200, {
      inviterName: 'Me',
      contactName: 'SomeoneElse',
      selfInvite: true,
    }));

    params.set('token', 'self');
    render(<AcceptInvitePage />);
    await waitFor(() => screen.getByText(/intended for someone else/i));
    // the contactName should also appear in the explanatory text
    expect(screen.getByText(/SomeoneElse/)).toBeInTheDocument();
    expect(screen.queryByText('Accept')).toBeNull();
    expect(screen.queryByText('Reject')).toBeNull();
  });

  it('redirects after accepting or rejecting', async () => {
    // accept path
    (fetch as jest.Mock)
      .mockResolvedValueOnce(makeResponse(true, 200, { inviterName: 'Alice', contactName: 'Bob' }))
      .mockResolvedValueOnce(makeResponse(true, 200, {})); // accept call

    params.set('token', 'tok1');
    render(<AcceptInvitePage />);
    await waitFor(() => screen.getByText(/Alice/));
    const acceptButton = screen.getByText('Accept');
    acceptButton.click();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/?accepted=true'));

    // reject path
    replaceMock.mockReset();
    (fetch as jest.Mock)
      .mockResolvedValueOnce(makeResponse(true, 200, { inviterName: 'Alice', contactName: 'Bob' }))
      .mockResolvedValueOnce(makeResponse(true, 200, {})); // reject call

    params.set('token', 'tok2');
    render(<AcceptInvitePage />);
    await waitFor(() => screen.getByText(/Alice/));
    const rejectButton = screen.getByText('Reject');
    rejectButton.click();
    // since our code builds origin using window.location, mimic that in test
    const expectedOrigin = 'http://localhost'.replace(':3002', ':3001');
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith(`${expectedOrigin}/?rejected=true`));
  });
});

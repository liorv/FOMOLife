/// <reference types="jest" />
import { inviteContact, inviteInfo, rejectInvite, acceptInvite, inviteToGroup, acceptGroupInvite, leaveGroup, listContacts, createContact, updateContact, deleteContact, ApiError, } from '../src/contacts';
// simple helper to create a fake Response-like object
function makeResponse(ok, status = ok ? 200 : 500, body = {}) {
    return {
        ok,
        status,
        json: async () => body,
    };
}
describe('contacts api-client fault tolerance', () => {
    beforeEach(() => {
        // jest provides a global fetch type declaration
        global.fetch = jest.fn();
    });
    async function expectNetworkError(fn) {
        const promise = fn();
        await expect(promise).rejects.toThrow(/Network error/);
        await expect(promise).rejects.toBeInstanceOf(ApiError);
    }
    async function expectHttpError(fn, expectedMessage) {
        const promise = fn();
        await expect(promise).rejects.toThrow(expectedMessage);
        await expect(promise).rejects.toBeInstanceOf(ApiError);
    }
    it('listContacts success and failure', async () => {
        fetch.mockResolvedValue(makeResponse(true, 200, { contacts: [{ id: '1', name: 'foo' }] }));
        const list = await listContacts();
        expect(list.length).toBeGreaterThan(0);
        expect(list[0].name).toBe('foo');
        fetch.mockRejectedValue(new Error('boom'));
        await expectNetworkError(() => listContacts());
        fetch.mockResolvedValue(makeResponse(false, 404, { message: 'not found' }));
        await expectHttpError(() => listContacts(), 'not found');
    });
    it('create/update/delete contact propagate errors', async () => {
        const input = { name: 'bar' };
        fetch.mockResolvedValue(makeResponse(true, 201, { id: '2', name: 'bar' }));
        const c = await createContact(input);
        expect(c.name).toBe('bar');
        fetch.mockRejectedValue('network');
        await expectNetworkError(() => createContact(input));
        fetch.mockResolvedValue(makeResponse(false, 400, { error: 'bad' }));
        await expectHttpError(() => createContact(input), 'bad');
        // update
        fetch.mockResolvedValue(makeResponse(true, 200, { id: '2', name: 'baz' }));
        const updated = await updateContact('2', { name: 'baz' });
        expect(updated.name).toBe('baz');
        fetch.mockRejectedValue(new Error('uh oh'));
        await expectNetworkError(() => updateContact('2', { name: 'baz' }));
        fetch.mockResolvedValue(makeResponse(false, 500, { message: 'server' }));
        await expectHttpError(() => updateContact('2', { name: 'baz' }), 'server');
        // delete
        fetch.mockResolvedValue(makeResponse(true, 200, {}));
        await deleteContact('2');
        fetch.mockRejectedValue('x');
        await expectNetworkError(() => deleteContact('2'));
    });
    describe('invite endpoints', () => {
        it('inviteContact handles success, network and http errors', async () => {
            fetch.mockResolvedValue(makeResponse(true, 200, { inviteToken: 'tok' }));
            const res = await inviteContact('id');
            expect(res.inviteToken).toBe('tok');
            // simulate network failure
            fetch.mockRejectedValue(new Error('network'));
            await expectNetworkError(() => inviteContact('id'));
            fetch.mockResolvedValue(makeResponse(false, 403, { message: 'nope' }));
            await expectHttpError(() => inviteContact('id'), 'nope');
            try {
                await inviteContact('id');
            }
            catch (err) {
                expect(err).toBeInstanceOf(ApiError);
                expect(err.status).toBe(403);
                expect(err.body).toEqual({ message: 'nope' });
            }
        });
        it('inviteInfo default message', async () => {
            fetch.mockResolvedValue(makeResponse(true, 200, { inviterName: 'a', contactName: 'b', selfInvite: false }));
            const info = await inviteInfo('token');
            expect(info.inviterName).toBe('a');
            expect(info.selfInvite).toBe(false);
            fetch.mockResolvedValue(makeResponse(false, 404, {}));
            await expectHttpError(() => inviteInfo('token'), 'invalid invite');
            // if the server returns broken JSON the default error message is used
            fetch.mockResolvedValue({
                ok: false,
                status: 422,
                json: async () => {
                    throw new Error('not json');
                },
            });
            await expectHttpError(() => inviteInfo('token'), 'invalid invite');
        });
        it('inviteInfo does not retry when backend lookup is deterministic', async () => {
            fetch.mockResolvedValueOnce(makeResponse(true, 200, { inviterName: 'x', contactName: 'y' }));
            const info = await inviteInfo('token');
            expect(info.inviterName).toBe('x');
        });
        it('rejectInvite and acceptInvite error paths', async () => {
            fetch.mockResolvedValue(makeResponse(true, 200, {}));
            await rejectInvite('tok');
            fetch.mockRejectedValue('err');
            await expectNetworkError(() => rejectInvite('tok'));
            fetch.mockResolvedValue(makeResponse(true, 200, { id: '3' }));
            await acceptInvite('tok');
            fetch.mockResolvedValue(makeResponse(false, 500, { message: 'fail' }));
            await expectHttpError(() => acceptInvite('tok'), 'fail');
        });
    });
    describe('group endpoints', () => {
        it('inviteToGroup / acceptGroupInvite / leaveGroup', async () => {
            fetch.mockResolvedValue(makeResponse(true, 200, { token: 'g' }));
            await inviteToGroup('g1', 'c1');
            fetch.mockResolvedValue(makeResponse(true, 200, { id: 'g1' }));
            await acceptGroupInvite('tok');
            fetch.mockResolvedValue(makeResponse(true, 200, { ok: true }));
            await leaveGroup('g1');
            fetch.mockResolvedValue(makeResponse(false, 422, { error: 'bad group' }));
            await expectHttpError(() => inviteToGroup('g1', 'c1'), 'bad group');
        });
    });
});

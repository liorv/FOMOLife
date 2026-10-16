jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: async (userId: string) => mockData.get(userId) ?? null,
    save: async (userId: string, data: PersistedUserData) => { mockData.set(userId, data); },
  }),
  getSupabaseAdminClient: () => null,
}));
jest.mock('@/lib/server/webPush', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));

import type { PersistedUserData } from '@myorg/storage';
import { createContact, updateContact, unlinkContact, listContacts } from '@/lib/contacts/server/contactsStore';

const mockData = new Map<string, PersistedUserData>();
const createdAt = '2026-10-07T10:00:00.000Z';
const linkedAt = '2026-10-07T11:00:00.000Z';

beforeEach(() => {
  mockData.clear();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(createdAt));
});

afterEach(() => jest.useRealTimers());

it('persists creation and linking timestamps, preserving them during profile edits', async () => {
  const contact = await createContact('owner', { name: 'Contact' });
  expect(contact).toMatchObject({ createdAt, linkedAt: null });
  jest.setSystemTime(new Date(linkedAt));
  expect(await updateContact('owner', contact.id, { status: 'linked', linkedUserId: 'friend' }))
    .toMatchObject({ createdAt, linkedAt });
  jest.setSystemTime(new Date('2026-10-07T12:00:00Z'));
  await updateContact('owner', contact.id, { name: 'Renamed', status: 'linked', linkedUserId: 'friend' });
  expect(await listContacts('owner')).toEqual([expect.objectContaining({ createdAt, linkedAt })]);
  expect(await unlinkContact('owner', contact.id)).toBe(true);
  expect(await listContacts('owner')).toEqual([expect.objectContaining({ createdAt, linkedAt: null })]);
  expect(await updateContact('owner', contact.id, { status: 'linked', linkedUserId: 'friend' }))
    .toMatchObject({ createdAt, linkedAt: '2026-10-07T12:00:00.000Z' });
});

it('records links established when creating a reciprocal contact', async () => {
  expect(await createContact('owner', { name: 'Friend', status: 'linked', linkedUserId: 'friend' }))
    .toMatchObject({ createdAt, linkedAt: createdAt });
  expect(mockData.get('owner')?.people).toEqual([expect.objectContaining({ createdAt, linkedAt: createdAt })]);
});

it('does not invent legacy dates during profile updates', async () => {
  mockData.set('owner', { people: [{ id: 'legacy', name: 'Friend', status: 'linked', linkedUserId: 'friend' }] });
  const updated = await updateContact('owner', 'legacy', { name: 'Renamed' });
  expect(updated?.createdAt).toBeUndefined();
  expect(updated?.linkedAt).toBeUndefined();
});

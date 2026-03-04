/**
 * Error type thrown when an HTTP request fails.  Contains the
 * optional status code and parsed body to help callers make
 * decisions or report diagnostics.
 */
export declare class ApiError extends Error {
    status: number | undefined;
    body: any | undefined;
    constructor(message: string, status?: number, body?: any);
}
export interface InviteInfo {
    inviterName: string;
    contactName: string;
    /** true when the current user is the one who generated the invite */
    selfInvite?: boolean;
}
export declare function listContacts(): Promise<Contact[]>;
export declare function createContact(input: CreateContactRequest): Promise<Contact>;
export declare function updateContact(id: string, patch: UpdateContactRequest): Promise<Contact>;
export declare function deleteContact(id: string): Promise<void>;
export declare function inviteContact(contactId: string): Promise<InviteTokenResponse & {
    inviteLink?: string;
}>;
export declare function inviteInfo(token: string): Promise<InviteInfo>;
export declare function rejectInvite(token: string): Promise<void>;
export declare function acceptInvite(token: string): Promise<Contact>;
export declare function inviteToGroup(groupId: string, contactId: string): Promise<InviteTokenResponse>;
export declare function acceptGroupInvite(token: string): Promise<Group>;
export declare function leaveGroup(groupId: string): Promise<{
    ok: true;
}>;
import type { Contact, InviteToken, ContactGroupInput, Group, InviteTokenResponse } from '@myorg/types';
export type ContactsAuthMode = 'none' | 'mock-cookie';
export interface ContactsListResponse {
    contacts: Contact[];
}
export interface CreateContactRequest {
    name: string;
    login?: string;
    inviteToken?: InviteToken | null;
}
export interface UpdateContactRequest {
    name?: string;
    login?: string;
    status?: Contact['status'];
    inviteToken?: InviteToken | null;
}
export interface DeleteContactRequest {
    id: string;
}
export interface ContactsApiClient {
    listContacts(): Promise<Contact[]>;
    createContact(input: CreateContactRequest): Promise<Contact>;
    updateContact(id: string, patch: UpdateContactRequest): Promise<Contact>;
    deleteContact(id: string): Promise<void>;
    inviteContact(contactId: string): Promise<InviteTokenResponse>;
    inviteInfo(token: string): Promise<InviteInfo>;
    rejectInvite(token: string): Promise<void>;
    acceptInvite(token: InviteToken): Promise<Contact>;
    listGroups(): Promise<Group[]>;
    createGroup(input: ContactGroupInput): Promise<Group>;
    updateGroup(id: string, patch: ContactGroupInput): Promise<Group>;
    deleteGroup(id: string): Promise<void>;
    inviteToGroup(groupId: string, contactId: string): Promise<InviteTokenResponse>;
    acceptGroupInvite(token: InviteToken): Promise<Group>;
    leaveGroup(groupId: string): Promise<{
        ok: true;
    }>;
}
//# sourceMappingURL=contacts.d.ts.map
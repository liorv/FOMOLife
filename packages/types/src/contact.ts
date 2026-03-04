/**
 * Contact Types - Core contact entities
 * 
 * Represents contacts and their status in the FOMO Life system.
 * This type is shared across contacts, projects, and framework apps.
 */

/**
 * ContactStatus - Status of a contact invitation
 */
export type ContactStatus = 'not_linked' | 'link_pending' | 'linked';

/**
 * InviteToken - Token used for contact invitations
 */
export type InviteToken = string;

/**
 * Contact - Core contact entity
 */
export interface Contact {
  /** Unique identifier for the contact; generated as a GUID */
  id: string;
  /** Contact's display name */
  name: string;
  /** Contact's login email (optional) */
  login?: string;
  /** Current status of the contact relationship */
  status: ContactStatus;
  /** Token for invitation flow, null if not invited */
  inviteToken?: InviteToken | null;
  /** ID of the user this contact represents (for linked contacts) */
  linkedUserId?: string;
}

/**
 * ContactCreateInput - Input for creating a new contact
 */
export interface ContactCreateInput {
  name: string;
  login?: string;
  status?: ContactStatus;
  inviteToken?: InviteToken | null;
  linkedUserId?: string;
}

/**
 * ContactUpdateInput - Input for updating an existing contact
 */
export interface ContactUpdateInput {
  name?: string;
  login?: string;
  status?: ContactStatus;
  inviteToken?: InviteToken | null;
}

/**
 * InviteAcceptanceRequest - payload used when accepting a shared token
 */
export interface InviteAcceptanceRequest {
  token: InviteToken;
}

/**
 * ContactGroup - Represents a group of contacts
 */
export interface ContactGroup {
  /** Unique identifier for the group */
  id: string;
  /** Group display name */
  name: string;
  /** Array of contact IDs in the group */
  contactIds: string[];
}

/**
 * ContactGroupInput - Input for creating/updating a group
 */
export interface ContactGroupInput {
  name: string;
}

/**
 * Group - Alias for ContactGroup (for API response consistency)
 */
export type Group = ContactGroup;

/**
 * InviteTokenResponse - Response for invite endpoints
 */
export interface InviteTokenResponse {
  inviteToken: InviteToken;
  /**
   * fully formed URL that can be shared with the invitee; the server logs
   * this for convenience but clients may also construct it themselves using
   * NEXT_PUBLIC_BASE_URL.
   */
  inviteLink?: string;
}

/**
 * InviteInfo - Metadata about a pending invite token
 */
export interface InviteInfo {
  inviterName: string;
  contactName: string;
  /** true when the current user is the one who generated the invite */
  selfInvite?: boolean;
}
/**
 * ContactGroup - named collection of contacts
 */
export interface ContactGroup {
  id: string;
  name: string;
  // list of contact ids contained in the group
  contactIds: string[];
}

/**
 * Input for creating or updating a contact group
 */
export interface ContactGroupInput {
  name: string;
  contactIds?: string[];
}

/**
 * Contact Types - Core contact entities
 * 
 * Represents contacts and their status in the FOMO Life system.
 * This type is shared across contacts, projects, and framework apps.
 */

/**
 * ContactStatus - Status of a contact invitation
 */
export type ContactStatus = 'none' | 'invited' | 'accepted';

/**
 * InviteToken - Token used for contact invitations
 */
export type InviteToken = string;

/**
 * Contact - Core contact entity
 */
export interface Contact {
  /** Unique identifier for the contact */
  id: string;
  /** Contact's display name */
  name: string;
  /** Contact's login email (optional) */
  login?: string;
  /** Current status of the contact relationship */
  status: ContactStatus;
  /** Token for invitation flow, null if not invited */
  inviteToken?: InviteToken | null;
}

/**
 * ContactCreateInput - Input for creating a new contact
 */
export interface ContactCreateInput {
  name: string;
  login?: string;
  status?: ContactStatus;
  inviteToken?: InviteToken | null;
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

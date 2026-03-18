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
 * ConnectionStatus - Status of a connection in the two-phase handshake
 */
export type ConnectionStatus = 'PENDING' | 'CONNECTED';

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
  /** OAuth provider (e.g., 'google', 'github', 'x') */
  oauthProvider?: string;
  /** Avatar URL from OAuth provider */
  avatarUrl?: string;
  /** Real Full Name from OAuth profile */
  realName?: string;
  /** Real Email from OAuth profile */
  realEmail?: string;
}

/**
 * Connection - Represents a bidirectional connection between users
 */
export interface Connection {
  /** Unique identifier for the connection */
  id: string;
  /** ID of the user who initiated the connection */
  inviterId: string;
  /** ID of the user who was invited */
  invitedId: string;
  /** Current status of the connection */
  status: ConnectionStatus;
  /** When the connection was created */
  createdAt: string;
  /** When the connection was last updated */
  updatedAt: string;
}

/**
 * InvitationLink - Represents an invitation link with expiration
 */
export interface InvitationLink {
  /** Unique identifier for the invitation */
  id: string;
  /** ID of the user who created the invitation */
  creatorId: string;
  /** Secure token for the invitation */
  token: string;
  /** When the invitation expires (7 days from creation) */
  expiresAt: string;
  /** Whether the invitation has been used */
  isUsed: boolean;
}

/**
 * InviterProfile - Public profile information shown to invitees
 */
export interface InviterProfile {
  /** Full name of the inviter */
  fullName: string;
  /** Email address of the inviter */
  email: string;
  /** OAuth provider (e.g., 'google', 'github', 'x') */
  oauthProvider: string;
  /** Avatar URL from OAuth provider */
  avatarUrl?: string;
  /** Real Full Name from OAuth profile */
  realName?: string;
  /** Real Email from OAuth profile */
  realEmail?: string;
}

/**
 * PendingRequest - Represents a pending connection approval request
 */
export interface PendingRequest {
  /** Unique identifier for the request */
  id: string;
  /** Profile of the user requesting connection */
  requesterProfile: InviterProfile;
  /** When the request was made */
  requestedAt: string;
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
 * GenerateInviteResponse - Response when generating a new invitation link
 */
export interface GenerateInviteResponse {
  /** The invitation link URL */
  inviteLink: string;
  /** The token (for internal use) */
  token: string;
  /** The expiration date of the invitation link */
  expiresAt: string;
}

/**
 * RequestLinkageRequest - Phase 1 request payload
 */
export interface RequestLinkageRequest {
  token: InviteToken;
}

/**
 * ApproveRequestRequest - Phase 2 approval payload
 */
export interface ApproveRequestRequest {
  requestId: string;
}

/**
 * ContactsListResponse - Response containing established contacts
 */
export interface ContactsListResponse {
  contacts: Contact[];
}

/**
 * PendingRequestsResponse - Response containing pending approval requests
 */
export interface PendingRequestsResponse {
  requests: PendingRequest[];
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

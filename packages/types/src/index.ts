export interface BaseEntity {
  id: string;
}

export type InviteToken = string;

export type ContactStatus = "none" | "invited" | "accepted";

export interface Contact extends BaseEntity {
  name: string;
  login?: string;
  status: ContactStatus;
  inviteToken?: InviteToken | null;
}

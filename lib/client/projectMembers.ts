import type { Contact, ProjectMember } from '@myorg/types';

export function getProjectMemberContacts(members: ProjectMember[]): Contact[] {
  return members.map(member => ({
    id: member.userId,
    name: member.name,
    status: 'linked',
    linkedUserId: member.userId,
    ...(member.avatarUrl ? { avatarUrl: member.avatarUrl } : {}),
  }));
}

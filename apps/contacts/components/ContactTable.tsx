'use client';

import { Contact } from '@myorg/types';
import { ContactTile } from '@myorg/ui';
import { isNonEmptyString } from '@myorg/utils';
import styles from '../styles/components/ContactTable.module.css';

type Props = {
  contacts: Contact[];
  newContactId: string | null;
  currentUserEmail: string | undefined;
  apiClient: any; // ContactsApiClient
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setCopiedLink: React.Dispatch<React.SetStateAction<string>>;
  setLinkCopied: React.Dispatch<React.SetStateAction<boolean>>;
  setNewContactId: React.Dispatch<React.SetStateAction<string | null>>;
};

export default function ContactTable({
  contacts,
  newContactId,
  currentUserEmail,
  apiClient,
  setContacts,
  setErrorMessage,
  setCopiedLink,
  setLinkCopied,
  setNewContactId,
}: Props) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.contactsTable}>
        <tbody>
          {contacts.map((contact) => (
            <ContactTile
              key={contact.id}
              id={contact.id}
              name={contact.name}
              status={contact.status}
              avatarUrl={null}
              autoFocus={newContactId === contact.id}
              onNameChange={async (newName) => {
                if (!isNonEmptyString(newName)) return;
                try {
                  const updated = await apiClient.updateContact(contact.id, { name: newName.trim() });
                  setContacts((prev) => prev.map((item) => (item.id === contact.id ? updated : item)));
                  if (newContactId === contact.id) {
                    setNewContactId(null);
                  }
                  // Clear any previous error
                  setErrorMessage(null);
                } catch (error) {
                  if (error instanceof Error && error.message.includes('Cannot name a contact as yourself')) {
                    setErrorMessage('You cannot name a contact with your own name.');
                  } else if (error instanceof Error && error.message.includes('A contact with this name already exists')) {
                    setErrorMessage('A contact with this name already exists.');
                  } else {
                    setErrorMessage(error instanceof Error ? error.message : 'Failed to update contact name');
                  }
                }
              }}
              onUnlink={async () => {
                try {
                  await apiClient.deleteContact(contact.id);
                  setContacts((prev) => prev.filter((item) => item.id !== contact.id));
                  setErrorMessage(null);
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : 'Failed to delete contact');
                }
              }}
              onLink={async () => {
                // update local status immediately for user feedback
                setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: 'link_pending' } : c));
              }}
              onInvite={async () => {
                try {
                  const resp = await apiClient.inviteContact(contact.id);
                  return resp.inviteToken || null;
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : 'Failed to send invitation');
                  return null;
                }
              }}
              onLinkSuccess={(link) => {
                setCopiedLink(link);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2500);
              }}
              isSelf={!!(contact.login && contact.login === currentUserEmail)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
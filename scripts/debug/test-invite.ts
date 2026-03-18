import { generateInviteLink, getInviteDetails } from './lib/contacts/server/contactsStore';
import { createStorageProvider } from '@myorg/storage';

async function run() {
  const { token } = await generateInviteLink('test_user');
  console.log("Token:", token);
  try {
    const details = await getInviteDetails(token);
    console.log("Details:", details);
  } catch (e) {
    console.log("Error:", e);
  }
}
run().catch(console.error);

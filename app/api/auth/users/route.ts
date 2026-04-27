import { NextResponse } from 'next/server';
import { readdirSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const userDataDir = join(process.cwd(), 'data', 'user_data');

    // Get all files in user_data directory
    const files = readdirSync(userDataDir);

    // Filter out system files and extract user IDs from filenames
    const userIds = files
      .filter(file => {
        // Exclude system files
        return !file.startsWith('sys') &&
               !file.startsWith('__') &&
               !file.includes('system_contacts') &&
               file.endsWith('.json');
      })
      .map(file => file.replace('.json', ''))
      .sort();

    return NextResponse.json({ users: userIds });
  } catch (error) {
    console.error('Error reading user data directory:', error);
    return NextResponse.json({ users: [] }, { status: 500 });
  }
}
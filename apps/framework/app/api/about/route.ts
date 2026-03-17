import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const formatted = date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    // "Mar 09, 2026, 6:05 PM" -> ["Mar 09", "2026", "6:05 PM"]
    const parts = formatted.split(', ');
    if (parts.length >= 3) {
      const datePart = `${parts[0]}, ${parts[1]}`;
      const timePart = parts[2]!.replace(' AM', 'am').replace(' PM', 'pm');
      return `${datePart} - ${timePart}`;
    }
    return formatted;
  } catch {
    return isoString;
  }
}

function getGitVersion(appPath: string): string {
  try {
    const rootDir = path.resolve(process.cwd(), '../..');
    let gitCommand;
    if (appPath) {
      gitCommand = `git -C "${rootDir}" log -1 --format='%ci' -- ${appPath}`;
    } else {
      gitCommand = `git -C "${rootDir}" log -1 --format='%ci'`;
    }
    const output = execSync(gitCommand, { encoding: 'utf-8' }).trim();
    return formatDate(output);
  } catch (error) {
    // Fallback to package.json version
    try {
      const rootDir = path.resolve(process.cwd(), '../..');
      const packagePath = path.join(rootDir, appPath || '', 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return pkg.version;
    } catch (fallbackError) {
      console.error('Failed to get version for', appPath, error, fallbackError);
      return 'unknown';
    }
  }
}

function getDBSource(): string {
  // In development, always file-based; in production, check Supabase
  if (process.env.NODE_ENV !== 'production') {
    return 'File-based';
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://your-project-ref.supabase.co') {
    return 'Supabase';
  }
  return 'File-based';
}

function getDeployTimestamp(): string {
  try {
    const versionPath = path.resolve(process.cwd(), 'version.json');
    const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
    return formatDate(data.version);
  } catch {
    // Fallback to git or package version
    return getGitVersion('');
  }
}

async function fetchAppVersion(url: string): Promise<string> {
  try {
    const res = await fetch(`${url}/api/about`, { 
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    if (res.ok) {
      const data = await res.json();
      return data.version || 'unknown';
    }
  } catch (err) {
    // Don't log errors during development startup - other apps may not be ready yet
    if (process.env.NODE_ENV === 'production') {
      console.error('Failed to fetch version from', url, err);
    }
  }
  return 'unknown';
}

export async function GET() {
  const [contactsVersion, tasksVersion, projectsVersion] = await Promise.all([
    fetchAppVersion(process.env.CONTACTS_URL || 'http://localhost:3002'),
    fetchAppVersion(process.env.TASKS_URL || 'http://localhost:3005'),
    fetchAppVersion(process.env.PROJECTS_URL || 'http://localhost:3003'),
  ]);

  const frameworkVersion = getDeployTimestamp();

  const versions = {
    framework: frameworkVersion,
    contacts: contactsVersion,
    tasks: tasksVersion,
    projects: projectsVersion,
  };

  const dbSource = getDBSource();

  return NextResponse.json({ versions, dbSource });
}
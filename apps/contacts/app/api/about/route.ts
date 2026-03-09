import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

function getDeployTimestamp(): string {
  try {
    const versionPath = path.resolve(process.cwd(), 'version.json');
    const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
    return formatDate(data.version);
  } catch {
    return 'unknown';
  }
}

export async function GET() {
  const version = getDeployTimestamp();
  return NextResponse.json({ version });
}
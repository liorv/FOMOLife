import 'server-only';

import { NextResponse } from 'next/server';
import { createStorageProvider } from '@myorg/storage';

const ALLOWED_DOMAINS = ['tasks', 'projects', 'people'] as const;
type AllowedDomain = (typeof ALLOWED_DOMAINS)[number];

function isDomain(v: string | null): v is AllowedDomain {
  return ALLOWED_DOMAINS.includes(v as AllowedDomain);
}

function getServiceKey(): string {
  const key = process.env.INTERNAL_SERVICE_KEY?.trim() ?? '';
  if (key.length < 32) {
    throw new Error('INTERNAL_SERVICE_KEY must be at least 32 characters');
  }
  return key;
}

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function validateRequest(request: Request): { userId: string; domain: AllowedDomain } | NextResponse {
  // Validate service key first — never trust X-User-Id before key check
  let expectedKey: string;
  try {
    expectedKey = getServiceKey();
  } catch {
    return NextResponse.json({ error: 'Storage gateway not configured' }, { status: 503 });
  }

  const providedKey = request.headers.get('X-Internal-Service-Key')?.trim() ?? '';
  if (!providedKey || providedKey !== expectedKey) {
    return unauthorizedResponse();
  }

  const userId = request.headers.get('X-User-Id')?.trim() ?? '';
  if (!userId) {
    return NextResponse.json({ error: 'X-User-Id header is required' }, { status: 400 });
  }

  const url = new URL(request.url);
  const domain = url.searchParams.get('domain');
  if (!isDomain(domain)) {
    return NextResponse.json(
      { error: `domain query param must be one of: ${ALLOWED_DOMAINS.join(', ')}` },
      { status: 400 },
    );
  }

  return { userId, domain };
}

const storage = createStorageProvider();

/**
 * GET /api/storage?domain=tasks|projects|people
 *
 * Returns the domain slice of the user's persisted data blob.
 * Headers: X-Internal-Service-Key, X-User-Id
 */
export async function GET(request: Request) {
  const validated = validateRequest(request);
  if (validated instanceof NextResponse) return validated;
  const { userId, domain } = validated;

  const blob = await storage.load(userId);
  if (!blob) {
    return NextResponse.json({ data: null }, { status: 200 });
  }

  let data: unknown;
  if (domain === 'tasks') {
    data = blob.tasks ?? [];
  } else if (domain === 'projects') {
    data = blob.projects ?? [];
  } else {
    // 'people' — includes both contacts and groups
    data = { people: blob.people ?? [], groups: blob.groups ?? [] };
  }

  return NextResponse.json({ data });
}

/**
 * PUT /api/storage?domain=tasks|projects|people
 *
 * Merges the provided domain slice into the user's persisted data blob and saves.
 * Body: { data: <slice> }
 * Headers: X-Internal-Service-Key, X-User-Id
 */
export async function PUT(request: Request) {
  const validated = validateRequest(request);
  if (validated instanceof NextResponse) return validated;
  const { userId, domain } = validated;

  const body = (await request.json()) as { data?: unknown };

  // Read-modify-write: load existing blob so we don't lose other domains' data
  const existing = (await storage.load(userId)) ?? {
    tasks: [],
    projects: [],
    people: [],
    groups: [],
  };

  if (domain === 'tasks') {
    existing.tasks = Array.isArray(body.data) ? body.data : [];
  } else if (domain === 'projects') {
    existing.projects = Array.isArray(body.data) ? body.data : [];
  } else {
    // 'people' — body.data is { people, groups }
    const slice = (body.data ?? {}) as { people?: unknown[]; groups?: unknown[] };
    existing.people = Array.isArray(slice.people) ? slice.people : [];
    existing.groups = Array.isArray(slice.groups) ? slice.groups : [];
  }

  await storage.save(userId, existing);
  return NextResponse.json({ ok: true });
}

import 'server-only';

import { NextResponse } from 'next/server';

/** Returns a 401 Unauthorized JSON response. */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Returns a route-specific CORS response decorator.
 * @param methods Comma-separated HTTP methods, e.g. 'GET,POST,OPTIONS'
 *
 * @example
 * const corsResponse = makeCorsResponse('POST,OPTIONS');
 * return corsResponse(NextResponse.json(data), request);
 */
export function makeCorsResponse(methods: string) {
  return function corsResponse(response: NextResponse, request?: Request) {
    const origin = request?.headers.get('origin') || '*';
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', methods);
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
  };
}

// Jest setup file
require('@testing-library/jest-dom');

// Minimal mock for next/server used in tests (Request/NextResponse)
// Minimal web Response polyfill used by Next server internals
class Response {
  constructor(body = null, init = {}) {
    this._body = body;
    this.status = typeof init.status === 'number' ? init.status : 200;
    // Use the global Headers implementation from jsdom when available
    this.headers = typeof Headers !== 'undefined' ? new Headers(init.headers || {}) : { append: () => {}, get: () => undefined };
  }
  async json() {
    return this._body;
  }
  static json(body, init) {
    return new Response(body, init);
  }
  static redirect(url, init = {}) {
    const r = new Response(null, init);
    r.redirect = url;
    return r;
  }
}

class Request {
	constructor(input = 'http://localhost', init = {}) {
		this.url = typeof input === 'string' ? input : (input && input.url) || 'http://localhost';
		this.headers = new Map(Object.entries(init.headers || {}));
		this.method = init.method || 'GET';
		const rawBody = init.body != null ? init.body : null;
		if (typeof rawBody === 'string') {
			try {
				this._body = JSON.parse(rawBody);
			} catch (e) {
				this._body = rawBody;
			}
		} else {
			this._body = rawBody;
		}
	}
	async json() {
		return this._body;
	}
}

// Provide globals if not already present
if (typeof global.Request === 'undefined') {
	// @ts-ignore
	global.Request = Request;
}
// Provide a minimal global Response so modules that import web Response don't fail
if (typeof global.Response === 'undefined') {
  // @ts-ignore
  global.Response = Response;
}

// Ensure a test-friendly global.fetch exists so code using fetch doesn't fail.
if (typeof global.fetch === 'undefined') {
	// @ts-ignore
	global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
}

// (no explicit jest.mock for 'next/server' — rely on global Response/NextResponse polyfills)

// Mock next/navigation hooks used by FrameworkHost
jest.mock('next/navigation', () => ({
	useRouter: () => ({ replace: jest.fn() }),
	usePathname: () => '/',
	useSearchParams: () => ({ get: (_key) => null, toString: () => '' }),
}));

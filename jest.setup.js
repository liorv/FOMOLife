// Jest setup file
require('@testing-library/jest-dom');

// Minimal mock for next/server used in tests (Request/NextResponse)
// Minimal web Response polyfill used by Next server internals
class SimpleHeaders {
	constructor(init = {}) {
		this.map = {};
		Object.entries(init || {}).forEach(([k, v]) => {
			this.map[k.toLowerCase()] = Array.isArray(v) ? v.slice() : [String(v)];
		});
	}
	append(key, value) {
		const k = key.toLowerCase();
		this.map[k] = this.map[k] || [];
		this.map[k].push(String(value));
	}
	get(key) {
		const arr = this.map[key.toLowerCase()];
		if (!arr) return null;
		return arr.join(', ');
	}
	set(key, value) {
		this.map[key.toLowerCase()] = [String(value)];
	}
}

class Response {
	constructor(body = null, init = {}) {
		this._body = body;
		this.status = typeof init.status === 'number' ? init.status : 200;
		this.headers = new SimpleHeaders(init.headers || {});
	}
	async json() {
		return this._body;
	}
	static json(body, init = {}) {
		return new Response(body, init);
	}
	static redirect(url, init = {}) {
		const status = typeof init.status === 'number' ? init.status : 302;
		const r = new Response(null, { status, headers: init.headers || {} });
		r.redirect = String(url);
		return r;
	}
}

class NextResponse extends Response {
	constructor(body = null, init = {}) {
		super(body, init);
		// cookies API: provide a .cookies object with set(name, value, opts)
		const cookies = [];
		this.cookies = {
			set: (name, value, _opts = {}) => {
				// create a simple Set-Cookie header string; include trailing semicolon for cleared cookies
				const cookieStr = value === '' ? `${name}=;` : `${name}=${value}`;
				cookies.push(cookieStr);
				// append to headers so tests can inspect 'set-cookie'
				this.headers.append('set-cookie', cookieStr);
			},
			_list: () => cookies.slice(),
		};
	}
	static json(body, init = {}) {
		return new NextResponse(body, init);
	}
	static redirect(url, init = {}) {
		const status = typeof init.status === 'number' ? init.status : 302;
		const r = new NextResponse(null, { status, headers: init.headers || {} });
		r.redirect = String(url);
		return r;
	}
}

class Request {
	constructor(input = 'http://localhost', init = {}) {
		this.url = typeof input === 'string' ? input : (input && input.url) || 'http://localhost';
		const rawHeaders = init.headers || {};
		// Provide a get() interface like Headers
		this.headers = {
			get: (k) => {
				const key = Object.keys(rawHeaders).find((h) => h.toLowerCase() === String(k).toLowerCase());
				if (!key) return null;
				return rawHeaders[key];
			},
		};
		this.method = init.method || 'GET';
		const rawBody = init.body != null ? init.body : null;
		this._body = rawBody;
		this._form = null;
	}
	async json() {
		if (typeof this._body === 'string') {
			try {
				return JSON.parse(this._body);
			} catch (e) {
				return this._body;
			}
		}
		return this._body;
	}
	async formData() {
		// simple formData stub supporting get(key)
		if (this._form) return this._form;
		// if body is a URLSearchParams-like string, parse it
		if (typeof this._body === 'string' && this._body.includes('=')) {
			const map = new Map();
			new URLSearchParams(this._body).forEach((v, k) => map.set(k, v));
			this._form = { get: (k) => map.get(k) };
			return this._form;
		}
		this._form = { get: () => null };
		return this._form;
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

// Expose NextResponse shim globally and mock 'next/server' to return it.
if (typeof global.NextResponse === 'undefined') {
	// @ts-ignore
	global.NextResponse = NextResponse;
}
try {
	jest.mock('next/server', () => ({ NextResponse: global.NextResponse }));
} catch (e) {
	// ignore if jest.mock is unavailable in this context
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

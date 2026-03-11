// Jest setup file
require('@testing-library/jest-dom');
// Reuse framework's minimal next/server shims here so API-route tests run
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
		const cookies = [];
		this.cookies = {
			set: (name, value, _opts = {}) => {
				const cookieStr = value === '' ? `${name}=;` : `${name}=${value}`;
				cookies.push(cookieStr);
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
		if (this._form) return this._form;
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

if (typeof global.Request === 'undefined') {
	// @ts-ignore
	global.Request = Request;
}
if (typeof global.Response === 'undefined') {
	// @ts-ignore
	global.Response = Response;
}
if (typeof global.NextResponse === 'undefined') {
	// @ts-ignore
	global.NextResponse = NextResponse;
}
try {
	jest.mock('next/server', () => ({ NextResponse: global.NextResponse }));
} catch (e) {}

if (typeof global.fetch === 'undefined') {
	// @ts-ignore
	global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
}

jest.mock('next/navigation', () => ({
	useRouter: () => ({ replace: jest.fn() }),
	usePathname: () => '/',
	useSearchParams: () => ({ get: (_key) => null, toString: () => '' }),
}));

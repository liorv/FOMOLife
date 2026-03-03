// Jest setup file
require('@testing-library/jest-dom');


// mock NextResponse from next/server so handlers can use its json helper
// without pulling in the full Next.js implementation which isn't available
// in a jest environment.
jest.mock('next/server', () => {
  const Headers = global.Headers || class Headers {
    constructor(init = {}) { this.map = {}; Object.entries(init).forEach(([k,v]) => this.map[k.toLowerCase()] = v); }
    append(k,v){ this.map[k.toLowerCase()] = v; }
    get(k){ return this.map[k.toLowerCase()]; }
    set(k,v){ this.map[k.toLowerCase()] = v; }
  };
  return {
    NextResponse: {
      json(body, init = {}) {
        return {
          body,
          status: init.status || 200,
          headers: new Headers(init.headers),
          json: async () => body,
        };
      },
    },
  };
});

// minimal polyfills for Request/Response/Headers so that API unit tests can
// construct Request objects without crashing.  We don't need full fetch
// semantics; just enough of the public surface used by our tests.
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = input;
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers);
      this.body = init.body;
    }
    clone() {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body,
      });
    }
    async json() {
      if (typeof this.body === 'string') {
        try {
          return JSON.parse(this.body);
        } catch {
          return null;
        }
      }
      return this.body;
    }
  };
}
if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init = {}) {
      this.map = {};
      Object.entries(init).forEach(([k, v]) => {
        this.map[k.toLowerCase()] = v;
      });
    }
    append(k, v) {
      this.map[k.toLowerCase()] = v;
    }
    get(k) {
      return this.map[k.toLowerCase()];
    }
    set(k, v) {
      this.map[k.toLowerCase()] = v;
    }
  };
}
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this._body = body;
      this.status = init.status || 200;
      this.headers = new Headers(init.headers);
      this.ok = this.status >= 200 && this.status < 300;
    }
    async json() {
      return this._body;
    }
    // mimic Fetch API static helper used by NextResponse implementation
    static json(body, init = {}) {
      return new Response(body, init);
    }
  };
}

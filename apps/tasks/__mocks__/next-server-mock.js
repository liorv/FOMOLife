// Minimal mock for next/server used in tests
class NextResponse {
  constructor(body = null, init = {}) {
    this._body = body;
    this.status = typeof init.status === 'number' ? init.status : 200;
    this.headers = new Map(Object.entries(init.headers || {}));
    this.redirected = !!init.redirected;
  }
  async json() {
    return this._body;
  }
  static json(body, init) {
    return new NextResponse(body, init);
  }
  static redirect(url, init = {}) {
    const r = new NextResponse(null, init);
    r.redirect = url;
    return r;
  }
}

class Request {
  // Mirror browser/Node Request(input, init) shape used by tests: the first
  // argument is the input (URL or Request-like), and the second is the init
  // object which may contain a `body` string. We parse JSON if provided.
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

module.exports = { Request, NextResponse };

/** @jest-environment node */
import handler from '../pages/api/storage';
import { clearData } from '../src/api/storage';

// simple response mock that captures status/headers/body
function makeRes() {
  let statusCode;
  let headers = {};
  let body;
  return {
    status(code) { statusCode = code; return this; },
    json(obj) { body = obj; return this; },
    end(msg) { body = msg; return this; },
    setHeader(name, value) { headers[name] = value; },
    _get() { return { statusCode, headers, body }; },
  };
}

beforeEach(async () => {
  await clearData();
});


// first API test: GET should return empty when no data stored
test('API GET returns empty when nothing stored', async () => {
  const req = { method: 'GET', query: {} };
  const res = makeRes();
  await handler(req, res);
  const result = res._get();
  expect(result.statusCode).toBe(200);
  expect(result.body).toEqual({ tasks: [], projects: [], dreams: [], people: [] });
});

test('API POST then GET persists value', async () => {
  const doc = { tasks: [{ text: 'foo' }], projects: [], dreams: [], people: [] };
  const postReq = { method: 'POST', query: {}, body: { data: doc } };
  const postRes = makeRes();
  await handler(postReq, postRes);
  expect(postRes._get().statusCode).toBe(200);

  const getReq = { method: 'GET', query: {} };
  const getRes = makeRes();
  await handler(getReq, getRes);
  expect(getRes._get().body).toEqual(doc);
});

test('API DELETE clears stored data', async () => {
  // store something first
  await handler({ method: 'POST', query: {}, body: { data: { tasks: [{text:'x'}], projects:[], dreams:[], people:[] } } }, makeRes());

  const delReq = { method: 'DELETE', query: {} };
  const delRes = makeRes();
  await handler(delReq, delRes);
  expect(delRes._get().statusCode).toBe(200);

  const checkRes = makeRes();
  await handler({ method: 'GET', query: {} }, checkRes);
  expect(checkRes._get().body).toEqual({ tasks: [], projects: [], dreams: [], people: [] });
});

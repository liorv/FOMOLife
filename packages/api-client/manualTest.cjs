const { inviteInfo, ApiError } = require('./dist/contacts');

function makeResponse(ok, status = ok ? 200 : 500, body = {}) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

async function run() {
  console.log('Starting manual test of inviteInfo retry logic');
  const responses = [];
  responses.push(makeResponse(false, 404, {}));
  responses.push(makeResponse(true, 200, { inviterName: 'x', contactName: 'y' }));

  global.fetch = async () => {
    const r = responses.shift();
    console.log('fetch called, returning', r.status);
    return r;
  };

  try {
    const info = await inviteInfo('token');
    console.log('inviteInfo returned', info);
  } catch (err) {
    console.error('inviteInfo threw', err);
  }
}

run();

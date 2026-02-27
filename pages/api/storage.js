import { loadData, saveData, clearData } from '../../src/api/storage';

// A very small HTTP API that delegates to the existing storage helpers on the
// server.  We keep the interface deliberately simple so the client-side code
// can treat the service like a thin wrapper around the same functions it would
// call directly in Node.

export default async function handler(req, res) {
  const { method } = req;
  // userId is passed as query parameter; leave it undefined if not provided so
  // the underlying helpers will fall back to the default namespace.
  const userId = req.query.userId || undefined;

  if (method === 'GET') {
    const data = await loadData(userId);
    return res.status(200).json(data);
  }

  if (method === 'POST') {
    // client sends { data: <object> } in body
    const { data } = req.body || {};
    await saveData(data || { tasks: [], projects: [], people: [] }, userId);
    return res.status(200).end();
  }

  if (method === 'DELETE') {
    await clearData(userId);
    return res.status(200).end();
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).end(`Method ${method} not allowed`);
}
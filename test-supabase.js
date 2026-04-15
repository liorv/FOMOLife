const { getSupabaseAdminClient } = require('./packages/storage/src/storage');
console.log(!!getSupabaseAdminClient());

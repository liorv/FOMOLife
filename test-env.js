require('dotenv').config({ path: '.env.local' });
console.log("LLM_PROVIDER:", process.env.LLM_PROVIDER);
console.log("GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);

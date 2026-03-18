const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'app/api/ai/generate/route.ts');
let content = fs.readFileSync(file, 'utf8');
content = content.replace("const llmProvider = LLMFactory.getProvider();", "console.log('LLM_PROVIDER inside route:', process.env.LLM_PROVIDER);\n    const llmProvider = LLMFactory.getProvider();");
fs.writeFileSync(file, content);

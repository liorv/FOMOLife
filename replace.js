const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/api/ai/generate/route.ts');
let content = fs.readFileSync(filePath, 'utf8');

const marker = "    // e.g., const completion = await openai.chat.completions.create({...})";
const splitIdx = content.indexOf(marker);

if (splitIdx !== -1) {
  content = content.slice(0, splitIdx) + `    const llmProvider = LLMFactory.getProvider();
    
    const payload = await llmProvider.generateBlueprint({
      goal, targetDate, complexity, context
    });

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('AI generate error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate blueprint' }, { status: 500 });
  }
}
`;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully replaced file content");
} else {
  console.log("Could not find marker string limit.");
}

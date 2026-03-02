import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const srcDir = resolve(currentDir, '../src');
const destDir = resolve(currentDir, '../dist');

// ensure output directory exists
await mkdir(destDir, { recursive: true });

// copy every .css file from src (preserving subfolders)
async function copyCssFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      await copyCssFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      const relative = fullPath.slice(srcDir.length + 1);
      const destPath = resolve(destDir, relative);
      await mkdir(dirname(destPath), { recursive: true });
      await copyFile(fullPath, destPath);
    }
  }
}

await copyCssFiles(srcDir);


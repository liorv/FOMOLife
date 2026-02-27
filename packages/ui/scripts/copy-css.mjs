import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const source = resolve(currentDir, '../src/styles.css');
const destination = resolve(currentDir, '../dist/styles.css');

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MAX_BYTES = 5 * 1024 * 1024;

const BLOCKED_PATTERNS = [
  /^\.turbo\//,
  /^\.next\//,
  /^\.vercel\//,
  /^coverage\//,
  /^dist\//,
  /\/\.turbo\//,
  /\/\.next\//,
  /\/\.vercel\//,
  /\/.cache\//,
  /\.tsbuildinfo$/,
  /\.tar\.zst$/,
];

function runGit(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function isBlockedPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function printFailures(title, rows) {
  console.error(`\n${title}`);
  for (const row of rows) {
    const sizeLabel = row.size == null ? '' : ` (${formatBytes(row.size)})`;
    console.error(` - ${row.path}${sizeLabel}`);
  }
}

function getStagedFiles() {
  const output = runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  if (!output) return [];
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function getRepoFiles() {
  const output = runGit(['ls-files']);
  if (!output) return [];
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function getBlobSizeFromIndex(filePath) {
  try {
    const bytes = runGit(['cat-file', '-s', `:${filePath}`]);
    return Number(bytes);
  } catch {
    return null;
  }
}

function checkFileList(files, sizeReader) {
  const blocked = [];
  const oversized = [];

  for (const filePath of files) {
    if (isBlockedPath(filePath)) {
      blocked.push({ path: filePath, size: sizeReader(filePath) });
      continue;
    }

    const size = sizeReader(filePath);
    if (size != null && size > MAX_BYTES) {
      oversized.push({ path: filePath, size });
    }
  }

  return { blocked, oversized };
}

function parsePushUpdates(stdin) {
  return stdin
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/);
      return { localRef, localSha, remoteRef, remoteSha };
    })
    .filter((row) => row.localSha && row.remoteSha);
}

function isAllZeroSha(sha) {
  return /^0+$/.test(sha || '');
}

function collectPushObjects(updates) {
  const objects = new Map();

  for (const update of updates) {
    if (isAllZeroSha(update.localSha)) {
      continue;
    }

    const range = isAllZeroSha(update.remoteSha)
      ? update.localSha
      : `${update.remoteSha}..${update.localSha}`;

    const output = runGit(['rev-list', '--objects', range]);
    if (!output) continue;

    const lines = output.split('\n').map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      const firstSpace = line.indexOf(' ');
      if (firstSpace <= 0) continue;
      const sha = line.slice(0, firstSpace);
      const filePath = line.slice(firstSpace + 1).trim();
      if (!filePath) continue;
      if (!objects.has(sha)) {
        objects.set(sha, filePath);
      }
    }
  }

  return objects;
}

function getBlobSize(sha) {
  try {
    const type = runGit(['cat-file', '-t', sha]);
    if (type !== 'blob') return null;
    return Number(runGit(['cat-file', '-s', sha]));
  } catch {
    return null;
  }
}

function runPreCommit() {
  const files = getStagedFiles();
  if (files.length === 0) return 0;

  const { blocked, oversized } = checkFileList(files, getBlobSizeFromIndex);
  if (blocked.length || oversized.length) {
    if (blocked.length) {
      printFailures('Blocked generated/cache files staged for commit:', blocked);
    }
    if (oversized.length) {
      printFailures(`Files larger than ${formatBytes(MAX_BYTES)} staged for commit:`, oversized);
    }
    console.error('\nCommit blocked. Remove these files from git staging.');
    return 1;
  }

  return 0;
}

function runRepoScan() {
  const files = getRepoFiles();
  const { blocked, oversized } = checkFileList(files, (filePath) => {
    try {
      return fs.statSync(path.resolve(process.cwd(), filePath)).size;
    } catch {
      return null;
    }
  });

  if (blocked.length || oversized.length) {
    if (blocked.length) {
      printFailures('Blocked generated/cache files tracked in repository:', blocked);
    }
    if (oversized.length) {
      printFailures(`Tracked files larger than ${formatBytes(MAX_BYTES)}:`, oversized);
    }
    console.error('\nRepository scan failed.');
    return 1;
  }

  return 0;
}

function runPrePush(stdin) {
  const updates = parsePushUpdates(stdin);
  if (updates.length === 0) return 0;

  const objects = collectPushObjects(updates);
  if (objects.size === 0) return 0;

  const blocked = [];
  const oversized = [];

  for (const [sha, filePath] of objects) {
    const size = getBlobSize(sha);
    if (isBlockedPath(filePath)) {
      blocked.push({ path: filePath, size });
      continue;
    }
    if (size != null && size > MAX_BYTES) {
      oversized.push({ path: filePath, size });
    }
  }

  if (blocked.length || oversized.length) {
    if (blocked.length) {
      printFailures('Blocked generated/cache files detected in commits being pushed:', blocked);
    }
    if (oversized.length) {
      printFailures(`Files larger than ${formatBytes(MAX_BYTES)} detected in commits being pushed:`, oversized);
    }
    console.error('\nPush blocked. Remove these files from commits before pushing.');
    return 1;
  }

  return 0;
}

function main() {
  const mode = process.argv[2] || 'pre-commit';
  let code = 0;

  if (mode === 'pre-commit') {
    code = runPreCommit();
  } else if (mode === 'pre-push') {
    const stdin = fs.readFileSync(0, 'utf8');
    code = runPrePush(stdin);
  } else if (mode === 'repo') {
    code = runRepoScan();
  } else {
    console.error(`Unknown mode: ${mode}`);
    code = 2;
  }

  process.exit(code);
}

main();
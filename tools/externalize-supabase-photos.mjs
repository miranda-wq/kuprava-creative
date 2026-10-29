import fs from 'node:fs';
import path from 'node:path';

const roots = ['art', 'artist', 'docs'];
const photoExtensions = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const publicRoot = path.resolve('public');
const outputRoot = path.resolve('dist');
let removedFiles = 0;
let removedBytes = 0;

function visit(directory, relativeDirectory) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const sourcePath = path.join(directory, entry.name);
    const relativePath = path.join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      visit(sourcePath, relativePath);
      continue;
    }

    if (!entry.isFile() || !photoExtensions.test(entry.name)) continue;

    const outputPath = path.join(outputRoot, relativePath);
    if (!fs.existsSync(outputPath)) continue;

    removedBytes += fs.statSync(outputPath).size;
    fs.unlinkSync(outputPath);
    removedFiles += 1;
  }
}

for (const root of roots) {
  visit(path.join(publicRoot, root), root);
}

console.log(`Excluded ${removedFiles} Supabase-hosted photos (${(removedBytes / 1024 / 1024).toFixed(2)} MiB) from dist; source files are preserved.`);

// Retire the superseded branded Merani presentation from the public build.
fs.rmSync(path.join(outputRoot, 'docs', 'merani.pdf'), { force: true });

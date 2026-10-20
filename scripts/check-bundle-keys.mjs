// Fails if a built site contains a Supabase secret key or a service_role JWT.
// The bundle legitimately holds the words "sb_secret_" and "service_role" (the guard in
// src/lib/account/config.ts and the SDK), so this looks for real key shapes instead.
// Usage: node scripts/check-bundle-keys.mjs dist
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist';
const SECRET_KEY = /sb_secret_[A-Za-z0-9_-]{16,}/;
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g;
const TEXT = /\.(js|mjs|css|html|json|map|txt|webmanifest)$/;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (TEXT.test(name)) yield path;
  }
}

const found = [];
for (const path of files(root)) {
  const text = readFileSync(path, 'utf8');
  if (SECRET_KEY.test(text)) found.push(`${path}: Supabase secret key`);
  for (const [, payload] of text.matchAll(JWT)) {
    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (claims?.role === 'service_role') found.push(`${path}: service_role JWT`);
    } catch {
      // Not a JWT after all.
    }
  }
}

if (found.length) {
  console.error(`Secret keys found in ${root}:\n${found.join('\n')}`);
  process.exit(1);
}
console.log(`No secret keys in ${root}.`);

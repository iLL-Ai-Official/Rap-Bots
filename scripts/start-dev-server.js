#!/usr/bin/env node
// ESM-compatible cross-platform Node helper to start the Rap-Bots dev server with sensible defaults.
// Not for production use.

import { spawn } from 'child_process';

const defaults = {
  DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/rapbots_dev',
  SESSION_SECRET: 'dev-session-secret',
  REPLIT_DOMAINS: 'localhost',
  REPL_ID: 'dev',
  GROQ_API_KEY: 'dev',
  OPENAI_API_KEY: 'dev',
  STRIPE_SECRET_KEY: '',
  PORT: '5000',
  NODE_ENV: 'development',
};

for (const [k, v] of Object.entries(defaults)) {
  if (!process.env[k]) process.env[k] = v;
}

console.log('Starting Rap-Bots dev server with environment:');
console.log(`  NODE_ENV=${process.env.NODE_ENV}`);
console.log(`  PORT=${process.env.PORT}`);
console.log(`  DATABASE_URL=${process.env.DATABASE_URL}`);

const child = spawn('npx', ['tsx', 'server/index.ts'], { stdio: 'inherit', shell: true });

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

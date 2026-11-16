import fs from "node:fs";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";

const env = { ...parseEnv(fs.readFileSync('.env', 'utf8')), ...process.env };
const path = 'superset/.env';
if (!fs.existsSync(path)) {
  const url = new URL(env.SUPERSET_DATABASE_URL || env.DATABASE_URL_UNPOOLED || env.DATABASE_URL);
  url.searchParams.delete('schema');
  const settings = {
    SUPERSET_SECRET_KEY: randomBytes(48).toString('hex'),
    SUPERSET_ADMIN_PASSWORD: randomBytes(24).toString('hex'),
    SUPERSET_EMBED_PASSWORD: randomBytes(24).toString('hex'),
    FLEETFLOW_DATABASE_URL: url.toString().replace(/^postgres(ql)?:/, 'postgresql+psycopg2:'),
    FLEETFLOW_ORIGIN: env.AUTH_URL || 'http://localhost:3000',
  };
  fs.writeFileSync(path, Object.entries(settings).map(([k,v]) => `${k}='${v.replaceAll("'", "\\'")}'`).join('\n')+'\n');
}
const settings = parseEnv(fs.readFileSync(path, 'utf8'));
// Refresh the source connection without rotating metadata encryption or login secrets.
const databaseUrl = new URL(env.SUPERSET_DATABASE_URL || env.DATABASE_URL_UNPOOLED || env.DATABASE_URL);
databaseUrl.searchParams.delete('schema');
settings.FLEETFLOW_DATABASE_URL = databaseUrl.toString().replace(/^postgres(ql)?:/, 'postgresql+psycopg2:');
fs.writeFileSync(path, Object.entries(settings).map(([k,v]) => `${k}='${v.replaceAll("'", "\\'")}'`).join('\n')+'\n');
const localPath = '.env.local';
let local = fs.existsSync(localPath) ? fs.readFileSync(localPath, 'utf8') : '';
const updates = {
  SUPERSET_URL: 'http://localhost:8088',
  NEXT_PUBLIC_SUPERSET_URL: 'http://localhost:8088',
  SUPERSET_ANALYTICS_DASHBOARD_ID: 'd0f7c674-0177-4b8f-9743-c27fabab931a',
  SUPERSET_USERNAME: 'fleetflow-embed-service',
  SUPERSET_PASSWORD: settings.SUPERSET_EMBED_PASSWORD,
};
for (const [k,v] of Object.entries(updates)) {
  local = local.replace(new RegExp(`^${k}=.*\\r?\\n?`, 'gm'), '');
  local += `\n${k}=${JSON.stringify(v)}\n`;
}
fs.writeFileSync(localPath, local);
console.log('Local analytics configuration prepared. Secrets are in ignored superset/.env and .env.local.');

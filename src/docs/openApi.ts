import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const specPath = path.resolve(process.cwd(), 'docs', 'openapi.yaml');

let openapiDocument: Record<string, unknown> | undefined;

try {
  openapiDocument = parse(fs.readFileSync(specPath, 'utf8'));
} catch (err) {
  console.warn(JSON.stringify({ level: 'warn', message: 'Swagger docs not loaded', specPath }));
}

export { openapiDocument };
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const easPath = path.join(projectRoot, 'eas.json');
const ascAppId = process.env.APP_STORE_CONNECT_APP_ID?.trim();

if (!ascAppId || !/^\d{6,15}$/u.test(ascAppId)) {
  throw new Error(
    'APP_STORE_CONNECT_APP_ID must be the numeric Apple ID from App Store Connect.'
  );
}

const eas = JSON.parse(readFileSync(easPath, 'utf8'));
eas.submit = {
  ...(eas.submit ?? {}),
  production: {
    ...(eas.submit?.production ?? {}),
    ios: {
      ...(eas.submit?.production?.ios ?? {}),
      ascAppId,
    },
  },
};

writeFileSync(easPath, `${JSON.stringify(eas, null, 2)}\n`);
console.log('Configured the production iOS submission profile.');

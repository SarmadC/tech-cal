const endpoint =
  process.env.IOS_AASA_URL?.trim() ||
  'https://www.kure-cal.com/.well-known/apple-app-site-association';
const teamId = process.env.APPLE_TEAM_ID?.trim();

if (!teamId) {
  throw new Error('APPLE_TEAM_ID is required to validate the live AASA file.');
}

const response = await fetch(endpoint, {
  headers: { Accept: 'application/json' },
  redirect: 'error',
  signal: AbortSignal.timeout(15_000),
});

if (!response.ok) {
  throw new Error(`AASA endpoint returned HTTP ${response.status}.`);
}

const contentType = response.headers.get('content-type') ?? '';
if (!contentType.toLowerCase().includes('application/json')) {
  throw new Error(`AASA endpoint returned an invalid content type: ${contentType}.`);
}

const body = await response.json();
const expectedAppId = `${teamId}.com.kurecal.mobile`;
const details = body?.applinks?.details;
if (
  !Array.isArray(details) ||
  !details.some((detail) =>
    Array.isArray(detail?.appIDs) && detail.appIDs.includes(expectedAppId)
  )
) {
  throw new Error(`AASA response does not include ${expectedAppId}.`);
}

const paths = new Set(
  details.flatMap((detail) =>
    Array.isArray(detail?.components)
      ? detail.components.map((component) => component?.['/']).filter(Boolean)
      : []
  )
);
for (const requiredPath of ['/events/*', '/u/*', '/circle/*']) {
  if (!paths.has(requiredPath)) {
    throw new Error(`AASA response is missing ${requiredPath}.`);
  }
}

console.log('Live iOS Universal Links configuration passed.');

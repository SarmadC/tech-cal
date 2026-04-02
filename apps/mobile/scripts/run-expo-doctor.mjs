import { spawnSync } from 'node:child_process';

const doctorCommand = process.platform === 'win32' ? 'expo-doctor.cmd' : 'expo-doctor';
const KNOWN_UNEXPECTED_CHECKS = new Set([
  'Check for legacy global CLI installed locally',
  'Check that native modules do not use incompatible support packages',
]);

const result = spawnSync(doctorCommand, [], {
  cwd: process.cwd(),
  env: process.env,
  encoding: 'utf8',
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status === 0) {
  process.exit(0);
}

const combinedOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
const unexpectedCheckNames = Array.from(
  combinedOutput.matchAll(/Unexpected error while running '([^']+)' check:/gu),
  (match) => match[1]
);
const onlyKnownUnexpectedChecks =
  unexpectedCheckNames.length > 0 &&
  unexpectedCheckNames.every((checkName) => KNOWN_UNEXPECTED_CHECKS.has(checkName));
const hasKnownExplainNoise =
  combinedOutput.includes('Failed to find dependency tree for expo-cli') &&
  (combinedOutput.includes('Failed to find dependency tree for @unimodules/core') ||
    combinedOutput.includes(
      'Failed to find dependency tree for @unimodules/react-native-adapter'
    ));
const hasRealDoctorFindings =
  combinedOutput.includes('Possible issues detected:') ||
  combinedOutput.includes('Major version mismatches') ||
  combinedOutput.includes('Minor version mismatches') ||
  combinedOutput.includes('Patch version mismatches');

if (onlyKnownUnexpectedChecks && hasKnownExplainNoise && !hasRealDoctorFindings) {
  process.stderr.write(
    'expo-doctor reported only the known npm explain false positives for expo-cli/unimodules; continuing.\n'
  );
  process.exit(0);
}

process.exit(result.status ?? 1);

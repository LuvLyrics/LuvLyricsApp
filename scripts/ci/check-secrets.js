const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const riskyFileNames = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'credentials.json',
  'service-account.json',
  'google-services.json',
  'GoogleService-Info.plist',
]);

const textExtensions = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.toml',
  '.env',
  '.txt',
  '.xml',
  '.gradle',
  '.properties',
  '.plist',
]);

const secretPatterns = [
  {
    name: 'private key',
    regex: new RegExp('-----BEGIN (RSA |EC |OPENSSH |DSA )?' + 'PRIVATE KEY-----'),
  },
  { name: 'GitHub token', regex: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/ },
  { name: 'OpenAI API key', regex: /\bsk-(proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Google API key', regex: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  {
    name: 'Firebase private key field',
    regex: new RegExp('"private_key"\\s*:\\s*"-----BEGIN ' + 'PRIVATE KEY-----'),
  },
];

function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return output.split('\0').filter(Boolean);
}

function isTextFile(filePath) {
  const ext = path.extname(filePath);
  return textExtensions.has(ext) || path.basename(filePath).startsWith('.env');
}

const findings = [];

for (const file of getTrackedFiles()) {
  const baseName = path.basename(file);
  if (riskyFileNames.has(baseName)) {
    findings.push(`${file}: risky credential/config filename should not be committed`);
    continue;
  }

  if (!isTextFile(file)) continue;

  const absolutePath = path.join(ROOT, file);
  if (!fs.existsSync(absolutePath)) continue;

  const content = fs.readFileSync(absolutePath, 'utf8');
  for (const pattern of secretPatterns) {
    if (pattern.regex.test(content)) {
      findings.push(`${file}: possible ${pattern.name}`);
    }
  }
}

if (findings.length > 0) {
  console.error('Secret scan failed. Remove sensitive files/values before opening the PR.');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log('Secret scan passed.');

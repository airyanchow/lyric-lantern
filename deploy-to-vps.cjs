/**
 * deploy-to-vps.cjs  (v2 - no stored credentials)
 *
 * Uploads dist.tar.gz to the VPS, extracts it into the Docker volume that
 * nginx serves, and restarts the container.
 *
 * Authentication uses your existing `ssh hostinger` alias and its SSH key.
 * There is no password, no IP address and nothing secret in this file, so it
 * is safe to commit and safe to push to a public repo.
 *
 * Override the host with LL_SSH_HOST if your ssh alias is named differently.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HOST = process.env.LL_SSH_HOST || 'hostinger';
const localTar = path.join(__dirname, 'dist.tar.gz');

if (!fs.existsSync(localTar)) {
  console.error('ERROR: dist.tar.gz not found next to this script.');
  console.error('  Build first:  npm run build');
  console.error('  Then package: tar -czf dist.tar.gz -C dist .');
  process.exit(1);
}

const sizeKb = (fs.statSync(localTar).size / 1024).toFixed(0);
console.log(`Deploying dist.tar.gz (${sizeKb} KB) to "${HOST}"`);

// --- 1. Upload -------------------------------------------------------------
console.log('Uploading...');
try {
  execFileSync('scp', [localTar, `${HOST}:/docker/site-lyriclantern/dist.tar.gz`], {
    stdio: 'inherit',
  });
} catch (err) {
  console.error('ERROR: upload failed. Check that `ssh ' + HOST + '` works on its own.');
  process.exit(1);
}

// --- 2. Extract + restart --------------------------------------------------
// Built as a real multi-line script and piped to bash over stdin. Node writes
// exactly these bytes, so no CR characters can reach the Linux shell.
const remote = [
  'set -e',
  'cd /docker/site-lyriclantern',
  'VOLPATH=$(docker volume inspect site-lyriclantern_site-dist -f "{{.Mountpoint}}")',
  'echo "Volume: $VOLPATH"',
  'rm -rf "$VOLPATH"/*',
  'tar xzf dist.tar.gz -C "$VOLPATH"/',
  'rm -f dist.tar.gz',
  'echo "--- files now served ---"',
  'ls -la "$VOLPATH"/',
  'docker compose restart web',
  'echo DEPLOY_OK_MARKER',
].join('\n') + '\n';

console.log('Extracting and restarting the container...');
let out = '';
try {
  out = execFileSync('ssh', [HOST, 'bash', '-s'], {
    input: remote,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
  });
} catch (err) {
  console.error('ERROR: remote deploy failed.');
  if (err.stdout) console.error(err.stdout.toString());
  process.exit(1);
}

console.log(out);

if (!out.includes('DEPLOY_OK_MARKER')) {
  console.error('ERROR: remote script did not report success.');
  process.exit(1);
}

try { fs.unlinkSync(localTar); } catch { /* ignore */ }
console.log('Deploy finished successfully.');

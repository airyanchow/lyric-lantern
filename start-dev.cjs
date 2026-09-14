const path = require('path');
const { spawn } = require('child_process');

const projectDir = path.join(__dirname);
const vite = path.join(projectDir, 'node_modules', '.bin', 'vite.cmd');

const child = spawn(`"${vite}"`, ['--port', '5173'], {
  cwd: projectDir,
  stdio: 'inherit',
  shell: true,
});

child.on('error', (err) => {
  console.error('Failed to start vite:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

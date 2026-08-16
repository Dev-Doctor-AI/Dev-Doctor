import { spawn } from 'node:child_process';

const tests = [
  ['Bounded MVP real inference', 'test:e2e:mvp-smoke'],
  ['Full sequential real E2E', 'test:e2e'],
  ['Deterministic presentation', 'test:rich-presentation-smoke'],
];

const results = [];
for (const [label, script] of tests) {
  console.log(`\n=== ${label} (${script}) ===`);
  const startedAt = Date.now();
  const exitCode = await new Promise(resolve => {
    const child = spawn('npm', ['run', script], { shell: true, stdio: 'inherit' });
    child.once('error', error => {
      console.error(error);
      resolve(1);
    });
    child.once('exit', code => resolve(code ?? 1));
  });
  results.push({ label, script, exitCode, durationSeconds: Math.round((Date.now() - startedAt) / 1000) });
}

console.log('\n=== E2E RESULTS ===');
for (const result of results) {
  console.log(`${result.exitCode === 0 ? 'PASS' : 'FAIL'}  ${result.label} (${result.durationSeconds}s)`);
}
if (results.some(result => result.exitCode !== 0)) process.exitCode = 1;
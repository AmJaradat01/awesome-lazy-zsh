import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const testHome = mkdtempSync(join(tmpdir(), 'awesome-lazy-zsh-tests-'));
const integration = process.argv[2] === 'integration';
function testFiles(directory) {
  return readdirSync(directory).flatMap(name => {
    const file = join(directory, name);
    return statSync(file).isDirectory() ? testFiles(file) : file.endsWith('.test.js') ? [file] : [];
  });
}
const targets = integration
  ? testFiles('tests/integration')
  : testFiles('tests').filter(file => !file.startsWith(`tests${process.platform === 'win32' ? '\\' : '/'}integration`));
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...targets], {
  stdio: 'inherit',
  env: {
    ...process.env,
    AWESOME_LAZY_ZSH_DATA_HOME: testHome,
    AWESOME_LAZY_ZSH_TEST_MODE: '1'
  }
});
rmSync(testHome, { recursive: true, force: true });
process.exit(result.status ?? 1);

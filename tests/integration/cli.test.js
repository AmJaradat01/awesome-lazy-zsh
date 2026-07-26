import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('--version is noninteractive and reports the package version', () => {
  const output = execFileSync(process.execPath, ['src/index.js', '--version'], { encoding: 'utf8' }).trim();
  assert.equal(output, '3.4.5');
});

test('.zshrc updates are idempotent, preserve user content, and use stable package paths', () => {
  const isolatedHome = mkdtempSync(join(tmpdir(), 'awesome-lazy-zsh-integration-'));
  const zshrc = join(isolatedHome, '.zshrc');
  writeFileSync(zshrc, '# user export\nexport KEEP_ME=yes\nsource $ZSH/oh-my-zsh.sh\n');
  const program = `import { updateZshrc } from './src/utils/zshrcManager.js'; await updateZshrc(['git','redis'], 'starship'); await updateZshrc(['git','redis'], 'starship');`;
  execFileSync(process.execPath, ['--input-type=module', '-e', program], {
    env: { ...process.env, AWESOME_LAZY_ZSH_DATA_HOME: isolatedHome },
    stdio: 'ignore'
  });
  const content = readFileSync(zshrc, 'utf8');
  assert.match(content, /export KEEP_ME=yes/);
  assert.equal((content.match(/awesome-lazy-zsh managed block >>>/g) || []).length, 1);
  assert.equal((content.match(/source \$ZSH\/oh-my-zsh\.sh/g) || []).length, 1);
  assert.match(content, /src\/aliases\/redis\.zsh/);
  assert.match(content, /eval "\$\(starship init zsh\)"/);
});

test('symlinked .zshrc is rejected explicitly', () => {
  const isolatedHome = mkdtempSync(join(tmpdir(), 'awesome-lazy-zsh-symlink-'));
  const target = join(isolatedHome, 'real-zshrc');
  writeFileSync(target, '# user owned\n');
  symlinkSync(target, join(isolatedHome, '.zshrc'));
  const program = `import { updateZshrc } from './src/utils/zshrcManager.js'; await updateZshrc(['git'], 'robbyrussell');`;
  assert.throws(() => execFileSync(process.execPath, ['--input-type=module', '-e', program], {
    env: { ...process.env, AWESOME_LAZY_ZSH_DATA_HOME: isolatedHome },
    stdio: 'pipe'
  }), /Command failed/);
  assert.equal(readFileSync(target, 'utf8'), '# user owned\n');
});

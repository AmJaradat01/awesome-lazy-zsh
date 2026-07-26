/**
 * Tests for zshrcParser.js
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    parseZshrc,
    generateReport,
    hasManagedBlock,
    getManagedBlockContent,
    getUserContent,
    MANAGED_BLOCK_START,
    MANAGED_BLOCK_END
} from '../src/utils/zshrcParser.js';

describe('zshrcParser', () => {
    describe('parseZshrc', () => {
        it('should parse an empty file', () => {
            const result = parseZshrc('');
            assert.ok(result);
            assert.deepStrictEqual(result.errors, []);
            assert.deepStrictEqual(result.duplicates, []);
        });

        it('should extract theme from ZSH_THEME', () => {
            const content = 'ZSH_THEME="spaceship"';
            const result = parseZshrc(content);
            assert.strictEqual(result.settings.theme.value, 'spaceship');
        });

        it('should extract plugins array', () => {
            const content = 'plugins=(git zsh-autosuggestions docker)';
            const result = parseZshrc(content);
            assert.deepStrictEqual(result.settings.plugins, ['git', 'zsh-autosuggestions', 'docker']);
        });

        it('should detect duplicate themes', () => {
            const content = `ZSH_THEME="robbyrussell"
ZSH_THEME="spaceship"`;
            const result = parseZshrc(content);
            const themeDup = result.duplicates.find(d => d.type === 'theme');
            assert.ok(themeDup);
            assert.deepStrictEqual(themeDup.values, ['robbyrussell', 'spaceship']);
        });



        it('should detect duplicate plugins arrays', () => {
            const content = `plugins=(git docker)
plugins=(git npm)`;
            const result = parseZshrc(content);
            const pluginsDup = result.duplicates.find(d => d.type === 'plugins');
            assert.ok(pluginsDup);
        });

        it('should detect duplicate exports', () => {
            const content = `export EDITOR="vim"
export EDITOR="nano"`;
            const result = parseZshrc(content);
            const exportDup = result.duplicates.find(d => d.name === 'EDITOR');
            assert.ok(exportDup);
            assert.strictEqual(exportDup.type, 'export');
        });

        it('should detect duplicate aliases', () => {
            const content = `alias ll='ls -la'
alias ll='ls -l'`;
            const result = parseZshrc(content);
            const aliasDup = result.duplicates.find(d => d.name === 'll');
            assert.ok(aliasDup);
            assert.strictEqual(aliasDup.type, 'alias');
        });

        it('should detect orphaned fi', () => {
            const content = `echo "test"
fi`;
            const result = parseZshrc(content);
            const fiError = result.errors.find(e => e.message.includes("'fi'"));
            assert.ok(fiError);
            assert.strictEqual(fiError.severity, 'error');
        });

        it('should not flag matched if/fi', () => {
            const content = `if [ -f ~/.bashrc ]; then
    source ~/.bashrc
fi`;
            const result = parseZshrc(content);
            const fiError = result.errors.find(e => e.message.includes("'fi'"));
            assert.ok(!fiError);
        });

        it('should detect unclosed if block', () => {
            const content = `if [ -f ~/.bashrc ]; then
    source ~/.bashrc`;
            const result = parseZshrc(content);
            const unclosedError = result.errors.find(e => e.message.includes("Unclosed 'if'"));
            assert.ok(unclosedError);
        });



        it('should detect malformed PATH assignment', () => {
            const content = 'export PATH=~/.npm/bin:$PATHexport PATH="/bin:$PATH"';
            const result = parseZshrc(content);
            const pathError = result.errors.find(e => e.message.includes('malformed PATH'));
            assert.ok(pathError);
            assert.strictEqual(pathError.severity, 'warning');
        });

        it('should extract metadata from awesome-lazy-zsh comment', () => {
            const content = '# awesome-lazy-zsh-plugins=["git","docker","nvm"]';
            const result = parseZshrc(content);
            assert.deepStrictEqual(result.settings.allPlugins, ['git', 'docker', 'nvm']);
        });

        it('should identify managed block section', () => {
            const content = `# User stuff
export MYVAR="test"

${MANAGED_BLOCK_START}
# Managed content
ZSH_THEME="spaceship"
${MANAGED_BLOCK_END}

# More user stuff`;
            const result = parseZshrc(content);
            const managedSection = result.sections.find(s => s.type === 'managed');
            assert.ok(managedSection);
            assert.ok(managedSection.content.includes('ZSH_THEME'));
        });

        it('should separate user-pre and user-post content', () => {
            const content = `# Before managed
export BEFORE="yes"

${MANAGED_BLOCK_START}
ZSH_THEME="spaceship"
${MANAGED_BLOCK_END}

# After managed
export AFTER="yes"`;
            const result = parseZshrc(content);
            const userContent = getUserContent(result);
            assert.ok(userContent.pre.includes('BEFORE'));
            assert.ok(userContent.post.includes('AFTER'));
        });
    });

    describe('hasManagedBlock', () => {
        it('should return true when managed block exists', () => {
            const content = `${MANAGED_BLOCK_START}
content
${MANAGED_BLOCK_END}`;
            const result = parseZshrc(content);
            assert.strictEqual(hasManagedBlock(result), true);
        });

        it('should return false when no managed block', () => {
            const content = 'ZSH_THEME="robbyrussell"';
            const result = parseZshrc(content);
            assert.strictEqual(hasManagedBlock(result), false);
        });
    });

    describe('getManagedBlockContent', () => {
        it('should return managed block content', () => {
            const content = `${MANAGED_BLOCK_START}
ZSH_THEME="test"
${MANAGED_BLOCK_END}`;
            const result = parseZshrc(content);
            const managed = getManagedBlockContent(result);
            assert.ok(managed.includes('ZSH_THEME'));
        });

        it('should return null when no managed block', () => {
            const content = 'ZSH_THEME="test"';
            const result = parseZshrc(content);
            assert.strictEqual(getManagedBlockContent(result), null);
        });
    });

    describe('generateReport', () => {
        it('should generate a report with errors', () => {
            const content = 'fi';
            const result = parseZshrc(content);
            const report = generateReport(result);
            assert.ok(report.includes('Syntax Errors'));
        });

        it('should generate a report with duplicates', () => {
            const content = `alias test='a'
alias test='b'`;
            const result = parseZshrc(content);
            const report = generateReport(result);
            assert.ok(report.includes('Duplicates Found'));
        });

        it('should show current settings in report', () => {
            const content = `ZSH_THEME="spaceship"
plugins=(git docker)`;
            const result = parseZshrc(content);
            const report = generateReport(result);
            assert.ok(report.includes('spaceship'));
            assert.ok(report.includes('git'));
        });
    });
});

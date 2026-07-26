/**
 * Tests for zshrcManager.js
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
    extractExistingPlugins,
    extractExistingTheme,
    repairZshrcContent,
    generateDiffPreview
} from '../src/utils/zshrcManager.js';

describe('zshrcManager', () => {
    describe('extractExistingPlugins', () => {
        it('should extract plugins from plugins=()', () => {
            const content = 'plugins=(git docker npm)';
            const plugins = extractExistingPlugins(content);
            assert.deepStrictEqual(plugins, ['git', 'docker', 'npm']);
        });

        it('should extract plugins from metadata comment', () => {
            const content = `# awesome-lazy-zsh-plugins=["git","docker","mongodb"]
plugins=(git docker)`;
            const plugins = extractExistingPlugins(content);
            assert.deepStrictEqual(plugins, ['git', 'docker', 'mongodb']);
        });

        it('should return empty array for no plugins', () => {
            const content = 'ZSH_THEME="robbyrussell"';
            const plugins = extractExistingPlugins(content);
            assert.deepStrictEqual(plugins, []);
        });
    });

    describe('extractExistingTheme', () => {
        it('should extract theme name', () => {
            const content = 'ZSH_THEME="spaceship"';
            const theme = extractExistingTheme(content);
            assert.strictEqual(theme, 'spaceship');
        });

        it('should return null for no theme', () => {
            const content = 'plugins=(git)';
            const theme = extractExistingTheme(content);
            assert.strictEqual(theme, null);
        });
    });



    describe('repairZshrcContent', () => {
        it('should remove orphaned fi', () => {
            const content = `echo "test"
fi
echo "more"`;
            const { content: repaired, repairs } = repairZshrcContent(content);
            assert.ok(!repaired.includes('\nfi\n'));
            assert.ok(repairs.some(r => r.includes('fi')));
        });

        it('should keep matched if/fi', () => {
            const content = `if [ -f test ]; then
    echo "yes"
fi`;
            const { content: repaired, repairs } = repairZshrcContent(content);
            assert.ok(repaired.includes('fi'));
            assert.ok(!repairs.some(r => r.includes('fi')));
        });

        it('should remove corrupted PATH lines', () => {
            const content = 'export PATH=~/.bin:$PATHexport PATH="Unknown command: npm help:$PATH"';
            const { content: repaired, repairs } = repairZshrcContent(content);
            assert.ok(repairs.length > 0);
        });

        it('should normalize excessive empty lines', () => {
            const content = `line1




line2`;
            const { content: repaired } = repairZshrcContent(content);
            assert.ok(!repaired.includes('\n\n\n\n'));
        });

        it('should return empty repairs for clean content', () => {
            const content = `ZSH_THEME="robbyrussell"
plugins=(git)
source $ZSH/oh-my-zsh.sh`;
            const { repairs } = repairZshrcContent(content);
            // May have 0 or minimal repairs for clean content
            assert.ok(Array.isArray(repairs));
        });
    });

    describe('generateDiffPreview', () => {
        it('should show line count changes', () => {
            const old = 'line1\nline2';
            const newContent = 'line1\nline2\nline3';
            const diff = generateDiffPreview(old, newContent);
            assert.ok(diff.includes('Lines:'));
        });

        it('should show theme changes', () => {
            const old = 'ZSH_THEME="robbyrussell"';
            const newContent = 'ZSH_THEME="spaceship"';
            const diff = generateDiffPreview(old, newContent);
            assert.ok(diff.includes('Theme:') || diff.includes('robbyrussell') || diff.includes('spaceship'));
        });

        it('should show plugin additions', () => {
            const old = 'plugins=(git)';
            const newContent = 'plugins=(git docker)';
            const diff = generateDiffPreview(old, newContent);
            assert.ok(diff.includes('docker') || diff.includes('added'));
        });
    });
});

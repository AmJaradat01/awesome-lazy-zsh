/**
 * Unit tests for promptResume function in src/prompts.js
 * Uses the prompts library's inject feature for non-interactive testing.
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import prompts from 'prompts';
import { promptResume } from '../src/prompts.js';

describe('promptResume', () => {
    it('should return "resume" when user selects "Resume previous setup"', async () => {
        prompts.inject(['resume']);
        const result = await promptResume();
        assert.equal(result, 'resume');
    });

    it('should return "fresh" when user selects "Start fresh"', async () => {
        prompts.inject(['fresh']);
        const result = await promptResume();
        assert.equal(result, 'fresh');
    });

    it('should return null when user cancels (inject undefined)', async () => {
        prompts.inject([undefined]);
        const result = await promptResume();
        assert.equal(result, null);
    });
});

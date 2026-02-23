/**
 * @fileoverview Unit tests for css/styles.css — Task 3 (Custom CSS).
 *
 * Validates Task 3 acceptance criteria by parsing the raw CSS text:
 *
 * 1. File exists on disk and is non-empty.
 * 2. Global resets: box-sizing: border-box and body font-family are present.
 * 3. .input-error applies a visible red focus ring (outline: 2px solid <red>).
 * 4. @keyframes fadeSlideIn defines an entry animation (opacity 0 → 1).
 * 5. .todo-item uses the fadeSlideIn animation via the animation property.
 * 6. @keyframes strikethrough fades text-decoration-color from transparent.
 * 7. .completed-text has text-decoration: line-through, a transition property,
 *    and references the strikethrough animation.
 * 8. index.html links to css/styles.css via <link rel="stylesheet">.
 *
 * Note: CSS properties are verified by parsing the raw text with targeted
 * regular expressions.  jsdom does not load external stylesheets, so
 * computed-style assertions are not used here — property presence in the
 * source file is sufficient for these unit tests.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = resolve(__dirname, '../css/styles.css');
const HTML_PATH = resolve(__dirname, '../index.html');

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the declaration block for a simple (non-nested) CSS rule.
 * Works for flat selectors like `.foo { … }`.
 *
 * @param {string} css Full CSS source text.
 * @param {string} selector Escaped selector string, e.g. '\\.foo'.
 * @returns {string} The content between `{` and `}`, or '' if not found.
 */
function extractBlock(css, selectorPattern) {
  const re = new RegExp(`${selectorPattern}\\s*\\{([^}]+)\\}`, 's');
  const match = css.match(re);
  return match ? match[1] : '';
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('Custom CSS Stylesheet (css/styles.css) — Task 3', () => {
  let css;

  beforeAll(() => {
    css = readFileSync(CSS_PATH, 'utf-8');
  });

  // ── 1. File existence ────────────────────────────────────────────────────

  describe('file existence', () => {
    it('css/styles.css exists on disk', () => {
      expect(existsSync(CSS_PATH)).toBe(true);
    });

    it('the file has non-empty content', () => {
      expect(css.trim().length).toBeGreaterThan(0);
    });
  });

  // ── 2. Global resets ─────────────────────────────────────────────────────

  describe('global resets and font settings', () => {
    it('applies box-sizing: border-box via a universal/wildcard rule', () => {
      expect(css).toMatch(/box-sizing\s*:\s*border-box/);
    });

    it('body rule sets a font-family stack', () => {
      const block = extractBlock(css, 'body');
      expect(block).toMatch(/font-family\s*:/);
    });

    it('body font-family includes a system font or named font', () => {
      const block = extractBlock(css, 'body');
      // Must reference at least one named font (a word that is at least 2 chars)
      expect(block).toMatch(/font-family\s*:[^;]{4,}/);
    });
  });

  // ── 3. .input-error validation class ────────────────────────────────────

  describe('.input-error — validation error feedback', () => {
    let block;

    beforeAll(() => {
      block = extractBlock(css, '\\.input-error');
    });

    it('.input-error rule is defined in the stylesheet', () => {
      expect(css).toMatch(/\.input-error\s*\{/);
    });

    it('.input-error declares an outline property', () => {
      expect(block).toMatch(/outline\s*:/);
    });

    it('.input-error outline is at least 2px wide', () => {
      expect(block).toMatch(/outline\s*:\s*2px/);
    });

    it('.input-error outline uses solid style', () => {
      expect(block).toMatch(/outline\s*:\s*2px\s+solid/);
    });

    it('.input-error outline references a red colour (#ef4444, #dc2626, or keyword "red")', () => {
      // Accept the Tailwind red-500 hex (#ef4444), red-600 (#dc2626), or CSS keyword
      const redPattern = /(#ef4444|#dc2626|#e53e3e|#f44336|\bred\b)/i;
      expect(block).toMatch(redPattern);
    });

    it('.input-error also sets border-color to red for ring continuity', () => {
      expect(block).toMatch(/border-color\s*:/);
    });
  });

  // ── 4. @keyframes fadeSlideIn — entry animation ──────────────────────────

  describe('@keyframes fadeSlideIn — todo item entry animation', () => {
    it('a @keyframes named fadeSlideIn is defined', () => {
      expect(css).toMatch(/@keyframes\s+fadeSlideIn\s*\{/);
    });

    it('fadeSlideIn "from" frame sets opacity to 0', () => {
      // Within the keyframes block there should be: from { ... opacity: 0 ... }
      expect(css).toMatch(/from\s*\{[^}]*opacity\s*:\s*0/s);
    });

    it('fadeSlideIn "to" frame sets opacity to 1', () => {
      expect(css).toMatch(/to\s*\{[^}]*opacity\s*:\s*1/s);
    });

    it('fadeSlideIn "from" frame uses a translateY transform', () => {
      expect(css).toMatch(/from\s*\{[^}]*transform\s*:\s*translateY/s);
    });
  });

  // ── 5. .todo-item — entry animation application ──────────────────────────

  describe('.todo-item — entry animation class', () => {
    let block;

    beforeAll(() => {
      block = extractBlock(css, '\\.todo-item');
    });

    it('.todo-item rule is defined', () => {
      expect(css).toMatch(/\.todo-item\s*\{/);
    });

    it('.todo-item uses the animation shorthand property', () => {
      expect(block).toMatch(/animation\s*:/);
    });

    it('.todo-item animation references the fadeSlideIn keyframe', () => {
      expect(block).toMatch(/animation\s*:[^;]*fadeSlideIn/);
    });

    it('.todo-item animation has a positive duration', () => {
      // e.g. 0.2s or 200ms
      expect(block).toMatch(/animation\s*:[^;]*\d+(\.\d+)?(s|ms)/);
    });
  });

  // ── 6. @keyframes strikethrough ──────────────────────────────────────────

  describe('@keyframes strikethrough — decoration colour animation', () => {
    it('a @keyframes named strikethrough is defined', () => {
      expect(css).toMatch(/@keyframes\s+strikethrough\s*\{/);
    });

    it('strikethrough "from" frame sets text-decoration-color to transparent', () => {
      expect(css).toMatch(/from\s*\{[^}]*text-decoration-color\s*:\s*transparent/s);
    });

    it('strikethrough "to" frame sets text-decoration-color to a visible colour', () => {
      // The final colour must be a hex value or CSS colour keyword (not transparent)
      expect(css).toMatch(/to\s*\{[^}]*text-decoration-color\s*:\s*#[0-9a-fA-F]{3,6}/s);
    });
  });

  // ── 7. .completed-text — strikethrough with transition ───────────────────

  describe('.completed-text — strikethrough with smooth transition', () => {
    let block;

    beforeAll(() => {
      block = extractBlock(css, '\\.completed-text');
    });

    it('.completed-text rule is defined', () => {
      expect(css).toMatch(/\.completed-text\s*\{/);
    });

    it('.completed-text applies text-decoration: line-through', () => {
      expect(block).toMatch(/text-decoration\s*:\s*line-through/);
    });

    it('.completed-text sets the text colour (color property)', () => {
      expect(block).toMatch(/\bcolor\s*:/);
    });

    it('.completed-text has a CSS transition property', () => {
      expect(block).toMatch(/transition\s*:/);
    });

    it('.completed-text transition targets the color property', () => {
      expect(block).toMatch(/transition\s*:[^;]*\bcolor\b/);
    });

    it('.completed-text transition also targets text-decoration-color for stroke smoothness', () => {
      expect(block).toMatch(/transition\s*:[^;]*text-decoration-color/);
    });

    it('.completed-text uses an animation property to play the strikethrough keyframe', () => {
      expect(block).toMatch(/animation\s*:/);
    });

    it('.completed-text animation references the strikethrough keyframe', () => {
      expect(block).toMatch(/animation\s*:[^;]*strikethrough/);
    });

    it('.completed-text animation uses "forwards" fill-mode so the end state persists', () => {
      expect(block).toMatch(/animation\s*:[^;]*forwards/);
    });

    it('.completed-text sets text-decoration-color to match the final animation state', () => {
      expect(block).toMatch(/text-decoration-color\s*:/);
    });
  });

  // ── 8. HTML integration ──────────────────────────────────────────────────

  describe('HTML integration — stylesheet linked from index.html', () => {
    it('index.html has a <link rel="stylesheet"> pointing to css/styles.css', () => {
      const html = readFileSync(HTML_PATH, 'utf-8');
      expect(html).toMatch(/href\s*=\s*["']css\/styles\.css["']/);
    });

    it('the <link> tag appears inside <head>', () => {
      const html = readFileSync(HTML_PATH, 'utf-8');
      // head block should contain the stylesheet link
      const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
      expect(headMatch).not.toBeNull();
      expect(headMatch[1]).toMatch(/css\/styles\.css/);
    });
  });
});

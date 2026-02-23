/**
 * @fileoverview Unit tests for the HTML Scaffold (index.html).
 *
 * Validates that index.html satisfies Task 1 acceptance criteria:
 * - Required DOM elements (#new-todo-input, #add-btn, #todo-list, etc.) exist.
 * - Tailwind CSS CDN <script> is included.
 * - Custom CSS stylesheet (css/styles.css) is referenced via <link>.
 * - Module script tag pointing to js/app.js is present.
 * - Page has valid HTML5 structure (DOCTYPE, html[lang], head, body).
 * - #todo-list is empty by default (no static children).
 * - An <h1> heading is present.
 * - A #storage-error-container placeholder element exists.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = resolve(__dirname, '../index.html');

describe('HTML Scaffold (index.html) — Task 1', () => {
  let doc;
  let rawHtml;

  beforeAll(() => {
    rawHtml = readFileSync(HTML_PATH, 'utf-8');
    const parser = new DOMParser();
    doc = parser.parseFromString(rawHtml, 'text/html');
  });

  // ── HTML5 Structure ────────────────────────────────────────────────────────

  describe('HTML5 structure', () => {
    it('starts with a <!DOCTYPE html> declaration', () => {
      expect(rawHtml.trimStart().toLowerCase()).toMatch(/^<!doctype html>/);
    });

    it('has an <html> element with a non-empty lang attribute', () => {
      const htmlEl = doc.querySelector('html');
      expect(htmlEl).toBeTruthy();
      expect(htmlEl.getAttribute('lang')).toBeTruthy();
    });

    it('has a <head> element', () => {
      expect(doc.querySelector('head')).toBeTruthy();
    });

    it('has a <body> element', () => {
      expect(doc.querySelector('body')).toBeTruthy();
    });

    it('has a <meta charset> tag in <head>', () => {
      const charset = doc.querySelector('head meta[charset]');
      expect(charset).toBeTruthy();
    });

    it('has a <meta name="viewport"> tag for responsive layout', () => {
      const viewport = doc.querySelector('head meta[name="viewport"]');
      expect(viewport).toBeTruthy();
    });
  });

  // ── External Resources ─────────────────────────────────────────────────────

  describe('external resources', () => {
    it('includes the Tailwind CSS CDN script', () => {
      const scripts = Array.from(doc.querySelectorAll('script'));
      const tailwind = scripts.find(
        (s) => s.src && s.src.includes('tailwindcss.com')
      );
      expect(tailwind).toBeTruthy();
    });

    it('has a <link rel="stylesheet"> referencing css/styles.css', () => {
      const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
      const customCss = links.find((l) => {
        const href = l.getAttribute('href') ?? '';
        return href.includes('styles.css');
      });
      expect(customCss).toBeTruthy();
    });

    it('has a <script type="module" src="js/app.js"> tag', () => {
      const scripts = Array.from(doc.querySelectorAll('script'));
      const appScript = scripts.find(
        (s) =>
          s.type === 'module' &&
          (s.getAttribute('src') ?? '').includes('app.js')
      );
      expect(appScript).toBeTruthy();
    });
  });

  // ── Visible UI Shell ───────────────────────────────────────────────────────

  describe('visible UI shell', () => {
    it('has an <h1> heading', () => {
      const heading = doc.querySelector('h1');
      expect(heading).toBeTruthy();
      expect(heading.textContent.trim().length).toBeGreaterThan(0);
    });

    it('has an <input> with id "new-todo-input"', () => {
      const input = doc.querySelector('#new-todo-input');
      expect(input).toBeTruthy();
      expect(input.tagName.toLowerCase()).toBe('input');
    });

    it('has a <button> with id "add-btn"', () => {
      const btn = doc.querySelector('#add-btn');
      expect(btn).toBeTruthy();
      expect(btn.tagName.toLowerCase()).toBe('button');
    });

    it('"Add" button has non-empty visible label text', () => {
      const btn = doc.querySelector('#add-btn');
      expect(btn.textContent.trim().length).toBeGreaterThan(0);
    });

    it('has a <ul> with id "todo-list"', () => {
      const list = doc.querySelector('#todo-list');
      expect(list).toBeTruthy();
      expect(list.tagName.toLowerCase()).toBe('ul');
    });

    it('#todo-list is empty (no static <li> children)', () => {
      const list = doc.querySelector('#todo-list');
      expect(list.children.length).toBe(0);
    });
  });

  // ── Error Feedback Placeholders ────────────────────────────────────────────

  describe('error feedback placeholders', () => {
    it('has a #storage-error-container element', () => {
      const container = doc.querySelector('#storage-error-container');
      expect(container).toBeTruthy();
    });
  });

  // ── Layout Containment ─────────────────────────────────────────────────────

  describe('layout containment', () => {
    it('#new-todo-input and #add-btn share a common ancestor container', () => {
      const input = doc.querySelector('#new-todo-input');
      const btn = doc.querySelector('#add-btn');
      // Walk up from the button to see if input is a sibling descendant
      const inputParent = input.parentElement;
      const btnParent = btn.parentElement;
      expect(inputParent).toBe(btnParent);
    });

    it('#todo-list is inside a wrapper div/section (not directly in body)', () => {
      const list = doc.querySelector('#todo-list');
      expect(list.parentElement.tagName.toLowerCase()).not.toBe('body');
    });
  });
});

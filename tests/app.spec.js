// @ts-check
/**
 * Todo App — Playwright E2E Test Suite
 *
 * Covers all acceptance criteria from docs/BUILD_PLAN.md.
 * Tests run against a real browser (Chromium / Firefox / WebKit) so
 * localStorage, CSS animations, and the full DOM environment are exercised.
 */
import { test, expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────
/** Add a single todo by typing into the input and clicking Add. */
async function addTodo(page, text) {
  await page.fill('#todo-input', text);
  await page.click('#add-btn');
}

/** Return all <li data-id> elements (real todos, not the placeholder). */
function todoItems(page) {
  return page.locator('#todo-list li[data-id]');
}

// ── Test setup ───────────────────────────────────────────────
test.beforeEach(async ({ page }) => {
  // Navigate first so localStorage is accessible, then clear it and reload
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// ── Task 1: HTML Shell & Page Layout ─────────────────────────
test.describe('Page layout', () => {
  test('renders without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    expect(errors).toHaveLength(0);
  });

  test('has required anchor elements', async ({ page }) => {
    await expect(page.locator('#todo-input')).toBeVisible();
    await expect(page.locator('#add-btn')).toBeVisible();
    await expect(page.locator('#todo-list')).toBeAttached();
  });

  test('Add button is labelled "Add"', async ({ page }) => {
    await expect(page.locator('#add-btn')).toHaveText('Add');
  });

  test('input is focusable', async ({ page }) => {
    await page.locator('#todo-input').focus();
    await expect(page.locator('#todo-input')).toBeFocused();
  });

  test('layout fits a 375 px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    // No horizontal scrollbar: scrollWidth should equal clientWidth
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHScroll).toBe(false);
  });
});

// ── Task 9: Empty State Placeholder ──────────────────────────
test.describe('Empty state', () => {
  test('shows placeholder message when list is empty', async ({ page }) => {
    await expect(page.locator('.todo-placeholder')).toBeVisible();
    await expect(page.locator('#todo-list')).toContainText('No todos yet');
  });

  test('placeholder disappears once a todo is added', async ({ page }) => {
    await addTodo(page, 'First todo');
    await expect(page.locator('.todo-placeholder')).not.toBeAttached();
  });

  test('placeholder reappears after last todo is deleted', async ({ page }) => {
    await addTodo(page, 'Only todo');
    await page.locator('[data-action="delete"]').click();
    await expect(page.locator('.todo-placeholder')).toBeVisible();
  });

  test('placeholder has no data-id attribute (not treated as a todo item)', async ({ page }) => {
    const placeholder = page.locator('.todo-placeholder');
    await expect(placeholder).not.toHaveAttribute('data-id');
  });
});

// ── Task 5: Add Todo ─────────────────────────────────────────
test.describe('Adding todos', () => {
  test('adds a todo by clicking the Add button', async ({ page }) => {
    await addTodo(page, 'Buy groceries');
    await expect(todoItems(page)).toHaveCount(1);
    await expect(page.locator('#todo-list')).toContainText('Buy groceries');
  });

  test('clears the input after a successful add', async ({ page }) => {
    await addTodo(page, 'Walk the dog');
    await expect(page.locator('#todo-input')).toHaveValue('');
  });

  test('adds a todo by pressing Enter', async ({ page }) => {
    await page.fill('#todo-input', 'Call dentist');
    await page.press('#todo-input', 'Enter');
    await expect(page.locator('#todo-list')).toContainText('Call dentist');
  });

  test('new todo appears at the top of the incomplete group', async ({ page }) => {
    await addTodo(page, 'First');
    await addTodo(page, 'Second');
    const items = todoItems(page);
    await expect(items.first().locator('.todo-text')).toContainText('Second');
  });

  test('trims whitespace from todo text', async ({ page }) => {
    await addTodo(page, '  Trimmed text  ');
    await expect(page.locator('.todo-text').first()).toHaveText('Trimmed text');
  });
});

// ── Task 8: Input Validation UX ──────────────────────────────
test.describe('Input validation', () => {
  test('shows error class on empty submission via button', async ({ page }) => {
    await page.click('#add-btn');
    await expect(page.locator('#todo-input')).toHaveClass(/input-error/);
  });

  test('shows error class on empty submission via Enter key', async ({ page }) => {
    await page.press('#todo-input', 'Enter');
    await expect(page.locator('#todo-input')).toHaveClass(/input-error/);
  });

  test('does not add a todo for empty input', async ({ page }) => {
    await page.click('#add-btn');
    await expect(todoItems(page)).toHaveCount(0);
  });

  test('does not add a todo for whitespace-only input', async ({ page }) => {
    await addTodo(page, '   ');
    await expect(todoItems(page)).toHaveCount(0);
  });

  test('preserves input value after a failed submission', async ({ page }) => {
    await page.fill('#todo-input', '   ');
    await page.click('#add-btn');
    // value should still be the whitespace (not cleared)
    const val = await page.locator('#todo-input').inputValue();
    expect(val).toBe('   ');
  });

  test('error class is removed automatically (~600 ms)', async ({ page }) => {
    await page.click('#add-btn');
    await page.waitForTimeout(750);
    await expect(page.locator('#todo-input')).not.toHaveClass(/input-error/);
  });

  test('error can fire multiple consecutive times', async ({ page }) => {
    await page.click('#add-btn');
    await page.waitForTimeout(750);
    await page.click('#add-btn');
    await expect(page.locator('#todo-input')).toHaveClass(/input-error/);
  });
});

// ── Task 6: Toggle Complete ───────────────────────────────────
test.describe('Toggling todos', () => {
  test.beforeEach(async ({ page }) => {
    await addTodo(page, 'Test todo');
  });

  test('checking the checkbox marks the todo complete', async ({ page }) => {
    await page.locator('[data-action="toggle"]').first().check();
    await expect(page.locator('.todo-text').first()).toHaveClass(/line-through/);
  });

  test('unchecking removes the strikethrough', async ({ page }) => {
    const cb = page.locator('[data-action="toggle"]').first();
    await cb.check();
    await cb.uncheck();
    await expect(page.locator('.todo-text').first()).not.toHaveClass(/line-through/);
  });

  test('completed todo moves to the bottom on re-render', async ({ page }) => {
    await addTodo(page, 'Second todo');

    // Target the "Second todo" item directly by text — avoids relying on DOM
    // position when Date.now() ties are possible in fast test environments.
    await todoItems(page)
      .filter({ hasText: 'Second todo' })
      .locator('[data-action="toggle"]')
      .check();

    const items = todoItems(page);
    // The completed item ("Second todo") should now be last
    await expect(items.last().locator('.todo-text')).toContainText('Second todo');
  });

  test('re-completing a toggled-back todo moves it down again', async ({ page }) => {
    await addTodo(page, 'Second todo');
    const cb = page.locator('[data-action="toggle"]').first();
    await cb.check();
    // Second todo is now at bottom; uncheck from that position
    await page.locator('[data-action="toggle"]').last().uncheck();
    // It should move back to the top of incompletes (newest)
    await expect(todoItems(page).first().locator('.todo-text')).toContainText('Second todo');
  });

  test('clicking list text area does not trigger a toggle', async ({ page }) => {
    await page.locator('.todo-text').first().click();
    await expect(page.locator('.todo-text').first()).not.toHaveClass(/line-through/);
  });

  test('localStorage reflects updated completed value', async ({ page }) => {
    const id = await page.locator('li[data-id]').first().getAttribute('data-id');
    await page.locator('[data-action="toggle"]').first().check();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('todos') || '[]'));
    const todo = stored.find(t => t.id === id);
    expect(todo.completed).toBe(true);
  });
});

// ── Task 7: Delete Todo ───────────────────────────────────────
test.describe('Deleting todos', () => {
  test('clicking ✕ removes the todo from the list', async ({ page }) => {
    await addTodo(page, 'Delete me');
    await page.locator('[data-action="delete"]').click();
    await expect(page.locator('#todo-list')).not.toContainText('Delete me');
  });

  test('deleted todo does not reappear after reload', async ({ page }) => {
    await addTodo(page, 'Gone after reload');
    await page.locator('[data-action="delete"]').click();
    await page.reload();
    await expect(page.locator('#todo-list')).not.toContainText('Gone after reload');
  });

  test('deleting the only item shows the empty-state placeholder', async ({ page }) => {
    await addTodo(page, 'Last item');
    await page.locator('[data-action="delete"]').click();
    await expect(page.locator('.todo-placeholder')).toBeVisible();
  });

  test('clicking text or checkbox area does not delete the todo', async ({ page }) => {
    await addTodo(page, 'Should survive');
    await page.locator('.todo-text').first().click();
    await expect(todoItems(page)).toHaveCount(1);
  });

  test('localStorage no longer contains deleted id', async ({ page }) => {
    await addTodo(page, 'To be removed');
    const id = await page.locator('li[data-id]').first().getAttribute('data-id');
    await page.locator('[data-action="delete"]').click();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('todos') || '[]'));
    expect(stored.find(t => t.id === id)).toBeUndefined();
  });
});

// ── Task 5: Persistence across reloads ───────────────────────
test.describe('Persistence', () => {
  test('todos survive a hard reload', async ({ page }) => {
    await addTodo(page, 'Persistent item');
    await page.reload();
    await expect(page.locator('#todo-list')).toContainText('Persistent item');
  });

  test('completed state survives a reload', async ({ page }) => {
    await addTodo(page, 'Complete me');
    await page.locator('[data-action="toggle"]').first().check();
    await page.reload();
    await expect(page.locator('[data-action="toggle"]').first()).toBeChecked();
    await expect(page.locator('.todo-text').first()).toHaveClass(/line-through/);
  });

  test('localStorage todos is valid JSON with correct shape', async ({ page }) => {
    await addTodo(page, 'Shape check');

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('todos') || '[]'));
    expect(stored).toHaveLength(1);

    const [todo] = stored;
    expect(typeof todo.id).toBe('string');
    expect(todo.id).toBeTruthy();
    expect(todo.text).toBe('Shape check');
    expect(todo.completed).toBe(false);
    expect(typeof todo.createdAt).toBe('number');
  });

  test('multiple todos are all persisted', async ({ page }) => {
    await addTodo(page, 'Alpha');
    await addTodo(page, 'Beta');
    await addTodo(page, 'Gamma');
    await page.reload();
    await expect(todoItems(page)).toHaveCount(3);
  });
});

// ── Sorting ───────────────────────────────────────────────────
test.describe('Sort order', () => {
  test('incomplete todos appear before completed todos', async ({ page }) => {
    await addTodo(page, 'Incomplete');
    await addTodo(page, 'Will be completed');

    // Target by text to avoid brittle DOM-position assumptions when timestamps tie
    await todoItems(page)
      .filter({ hasText: 'Will be completed' })
      .locator('[data-action="toggle"]')
      .check();

    const texts = await todoItems(page).locator('.todo-text').allTextContents();
    // Incomplete should come first, completed last
    expect(texts[0]).toBe('Incomplete');
    expect(texts[1]).toBe('Will be completed');
  });

  test('within the same group newest is listed first', async ({ page }) => {
    await addTodo(page, 'Older');
    await addTodo(page, 'Newer');
    const texts = await todoItems(page).locator('.todo-text').allTextContents();
    expect(texts[0]).toBe('Newer');
    expect(texts[1]).toBe('Older');
  });
});

// ── localStorage error resilience ────────────────────────────
test.describe('localStorage resilience', () => {
  test('loads gracefully when stored JSON is corrupt', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('todos', 'CORRUPT_DATA'));
    // No uncaught error; list should be empty (placeholder visible)
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.reload();
    await expect(page.locator('.todo-placeholder')).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('app works for the session even when localStorage.setItem throws', async ({ page }) => {
    // Override setItem to throw (simulates quota exceeded)
    await page.evaluate(() => {
      Storage.prototype.setItem = () => { throw new Error('Quota exceeded'); };
    });

    // Should not crash
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.fill('#todo-input', 'In-memory todo');
    await page.click('#add-btn');

    await expect(page.locator('#todo-list')).toContainText('In-memory todo');
    expect(errors).toHaveLength(0);
  });
});

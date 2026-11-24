/** Exercise reading and role-aware navigation with real browser-local data. */
import { test, expect } from '@playwright/test';

const writer = { userId: 'writer', username: 'writer', displayName: 'Ada Writer', role: 'user' };
const admin = { userId: 'admin-fixed', username: 'admin', displayName: 'Admin', role: 'admin' };
const posts = [
  { id: 'old', title: 'Earlier story', content: 'An earlier local story.', createdAt: '2024-01-01T12:00:00.000Z', authorId: 'other', authorName: 'Other Author' },
  { id: 'new', title: 'Recent story', content: `${'A'.repeat(120)} hidden in preview\n  second line`, createdAt: '2024-02-02T12:00:00.000Z', authorId: 'writer', authorName: 'Ada Writer' },
];

test('mobile reader navigates seeded posts and logs out without changing them', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(({ session, records }) => {
    localStorage.setItem('writespace_session', JSON.stringify(session));
    localStorage.setItem('writespace_posts', JSON.stringify(records));
  }, { session: writer, records: posts });
  await page.reload();
  await page.getByRole('link', { name: 'Start Reading' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  const cards = page.getByRole('article');
  await expect(cards.nth(0)).toContainText('Recent story');
  await expect(cards.nth(1)).toContainText('Earlier story');
  await expect(cards.nth(0)).toContainText('Feb 02, 2024');
  await expect(cards.nth(0)).not.toContainText('hidden in preview');
  await expect(page.getByRole('link', { name: 'Edit Recent story' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit Earlier story' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Recent story', exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/new$/);
  await expect(page.getByText('  second line')).toHaveCSS('white-space', 'pre-wrap');
  await page.reload();
  await expect(page.getByText('  second line')).toBeVisible();
  await page.getByRole('link', { name: 'Back to blogs' }).click();
  const menu = page.getByRole('button', { name: 'Toggle navigation menu' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(posts);
  expect(errors).toEqual([]);
});

test('guest preview redirects and admin can see all edit actions', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.evaluate((records) => localStorage.setItem('writespace_posts', JSON.stringify(records)), posts);
  await page.reload();
  await page.getByRole('link', { name: 'Recent story', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole('link', { name: 'All blogs' }).click();
  await expect(page.getByRole('link', { name: 'Edit Earlier story' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit Recent story' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a direct link to a missing post shows a recovery link', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(({ session, records }) => {
    localStorage.setItem('writespace_session', JSON.stringify(session));
    localStorage.setItem('writespace_posts', JSON.stringify(records));
  }, { session: admin, records: posts });
  await page.goto('/blog/not-here');
  await expect(page.getByRole('heading', { name: 'Post not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to blogs' }).click();
  await expect(page.getByRole('link', { name: 'Recent story', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

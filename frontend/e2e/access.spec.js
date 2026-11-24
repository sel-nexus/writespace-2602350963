/** Verify browser-local discovery and access journeys without mocking storage. */
import { test, expect } from '@playwright/test';

test('register, reload, logout and sign back in with a local account', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText(/Passwords are plain text/)).toBeVisible();
  await expect(page.getByText('No posts yet — check back soon!')).toBeVisible();
  await page.getByRole('link', { name: 'Get Started Free' }).click();
  await page.getByLabel('Display Name').fill('Local Writer');
  await page.getByLabel('Username').fill('local-writer');
  await page.getByLabel('Password', { exact: true }).fill('demo-only');
  await page.getByLabel('Confirm Password').fill('demo-only');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByText('Signed in as Local Writer')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Signed in as Local Writer')).toBeVisible();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/$/);
  const stored = await page.evaluate(() => ({ session: localStorage.getItem('writespace_session'), users: JSON.parse(localStorage.getItem('writespace_users')) }));
  expect(stored.session).toBeNull();
  expect(stored.users).toHaveLength(1);
  expect(stored.users[0].username).toBe('local-writer');
  await page.getByRole('link', { name: 'Login', exact: true }).first().click();
  await page.getByLabel('Username').fill('local-writer');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid username or password.');
  await page.getByLabel('Password').fill('demo-only');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  expect(errors).toEqual([]);
});

test('a guest preview redirects to login and the demo admin reaches its role home', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('writespace_posts', JSON.stringify([{ id: 'post-1', title: 'A local story', content: 'A real browser-local preview.', createdAt: '2024-01-01T00:00:00.000Z', authorId: 'writer', authorName: 'Writer' }])));
  await page.reload();
  await expect(page.getByText('A real browser-local preview.')).toBeVisible();
  await page.getByRole('link', { name: 'A local story' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByRole('link', { name: 'A local story' })).toBeVisible();
  expect(errors).toEqual([]);
});

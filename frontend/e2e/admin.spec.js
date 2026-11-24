/** Exercise admin dashboard and local account journeys in a real browser. */
import { test as base, expect } from '@playwright/test';

const test = base.extend({
  browserErrors: [async ({ page }, use) => {
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    await use(errors);
    expect(errors).toEqual([]);
  }, { auto: true }],
});

test('admin navigates posts and manages browser-local accounts', async ({ page, browserErrors }) => {
  const post = { id: 'admin-post', title: 'A local story', content: 'Sample text', createdAt: '2024-01-01T00:00:00.000Z', authorId: 'writer', authorName: 'Writer' };
  await page.goto('/');
  await page.evaluate((record) => {
    localStorage.clear();
    localStorage.setItem('writespace_posts', JSON.stringify([record]));
  }, post);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Login' }).click();
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('Statistic pending clarification')).toBeVisible();
  await page.getByRole('link', { name: 'A local story', exact: true }).click();
  await expect(page.getByText('Sample text')).toBeVisible();
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await page.getByRole('link', { name: 'Edit A local story' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('A local story');
  await page.getByRole('link', { name: 'Dashboard' }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete A local story' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([post]);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete A local story' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([]);
  await page.getByRole('link', { name: 'Manage Users' }).click();
  await expect(page.getByRole('button', { name: 'Delete admin' })).toBeDisabled();
  await page.getByLabel('Display name').fill('Demo writer');
  await page.getByLabel('Username').fill('demowriter');
  await page.getByLabel('Password').fill('sample');
  await page.getByLabel('Role').selectOption('user');
  await page.getByRole('button', { name: 'Create user' }).click();
  await expect(page.getByText('Account saved in this browser.')).toBeVisible();
  const [created] = await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')));
  expect(created).toMatchObject({ displayName: 'Demo writer', username: 'demowriter', role: 'user' });
  expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
  await page.reload();
  await expect(page.getByText('@demowriter')).toBeVisible();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete demowriter' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')))).toEqual([created]);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete demowriter' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')))).toEqual([]);
  await page.getByRole('link', { name: 'Back to dashboard' }).click();
  await page.getByRole('link', { name: 'Write New Post' }).click();
  await expect(page).toHaveURL(/\/write$/);
  expect(browserErrors).toEqual([]);
});

test('failed admin account write reports failure and preserves existing accounts', async ({ page }) => {
  const user = { id: 'existing', displayName: 'Existing', username: 'existing', password: 'demo', role: 'user', createdAt: '2024-01-01T00:00:00.000Z' };
  await page.goto('/');
  await page.evaluate((record) => localStorage.setItem('writespace_users', JSON.stringify([record])), user);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Login' }).click();
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Manage Users' }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'writespace_users') throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByLabel('Display name').fill('New writer');
  await page.getByLabel('Username').fill('newwriter');
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Create user' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Account was not saved. Check your admin session and browser storage, then try again.');
  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByText('Account saved in this browser.')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')))).toEqual([user]);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete existing' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Account was not deleted. It may be protected, missing, or browser storage may be unavailable.');
  await expect(page.getByText('@existing')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')))).toEqual([user]);
});

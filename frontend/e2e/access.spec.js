/** Verify browser-local discovery and access journeys without mocking storage. */
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

test('register, reload, logout and sign back in with a local account', async ({ page, browserErrors }) => {
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
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Invalid username or password.');
  await page.getByLabel('Password').fill('demo-only');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  expect(browserErrors).toEqual([]);
});

test('a guest preview redirects to login and the demo admin reaches its role home', async ({ page, browserErrors }) => {
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
  expect(browserErrors).toEqual([]);
});

test('public navigation opens registration', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Get Started', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole('heading', { name: 'Make space to write.' })).toBeVisible();
  await expect(page.getByLabel('Confirm Password')).toBeVisible();
});

test('footer navigation opens registration', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole('heading', { name: 'Make space to write.' })).toBeVisible();
  await expect(page.getByLabel('Display Name')).toBeVisible();
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Confirm Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
});

test('login page opens registration', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole('heading', { name: 'Make space to write.' })).toBeVisible();
  await expect(page.getByLabel('Confirm Password')).toBeVisible();
});

test('malformed accounts prevent registration without overwriting the damaged data', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('writespace_users', '{broken'));
  await page.getByRole('link', { name: 'Get Started Free' }).click();
  await page.getByLabel('Display Name').fill('Writer');
  await page.getByLabel('Username').fill('writer');
  await page.getByLabel('Password', { exact: true }).fill('demo');
  await page.getByLabel('Confirm Password').fill('demo');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Local accounts could not be read. Your account was not saved.');
  await expect(page).toHaveURL(/\/register$/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_users'))).toBe('{broken');
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
});

test('failed account write leaves registration and existing accounts unchanged', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('writespace_users', '[]');
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'writespace_users') throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('link', { name: 'Get Started Free' }).click();
  await page.getByLabel('Display Name').fill('Writer');
  await page.getByLabel('Username').fill('writer');
  await page.getByLabel('Password', { exact: true }).fill('demo');
  await page.getByLabel('Confirm Password').fill('demo');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Your account could not be saved. Please check browser storage and try again.');
  await expect(page).toHaveURL(/\/register$/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_users'))).toBe('[]');
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
});

test('failed session write reports the saved account without signing in', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'writespace_session') throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('link', { name: 'Get Started Free' }).click();
  await page.getByLabel('Display Name').fill('Writer');
  await page.getByLabel('Username').fill('writer');
  await page.getByLabel('Password', { exact: true }).fill('demo');
  await page.getByLabel('Confirm Password').fill('demo');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Your account was saved, but the session could not be saved. Please use Login to try again.');
  await expect(page).toHaveURL(/\/register$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')))).toMatchObject([{ username: 'writer', displayName: 'Writer' }]);
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
});

test('failed session persistence keeps login on the form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Login' }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'writespace_session') throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Your session could not be saved. Sign-in was not completed.');
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
});

test('failed session removal keeps the signed-in user on the dashboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Login' }).click();
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const session = await page.evaluate(() => {
    const saved = localStorage.getItem('writespace_session');
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key) {
      if (key === 'writespace_session') throw new DOMException('Storage unavailable', 'SecurityError');
      return original.call(this, key);
    };
    return saved;
  });
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Your session could not be cleared. Please check browser storage and try again.');
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBe(session);
});

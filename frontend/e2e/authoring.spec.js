/** Exercise the local authoring journey and browser persistence. */
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

const writer = { userId: 'writer', username: 'writer', displayName: 'Ada Writer', role: 'user' };

test('writer creates, edits, cancels and deletes a locally stored post', async ({ page, browserErrors }) => {
  await page.goto('/');
  await page.evaluate((session) => {
    localStorage.setItem('writespace_session', JSON.stringify(session));
    localStorage.setItem('writespace_posts', '[]');
  }, writer);
  await page.reload();
  await page.getByRole('link', { name: 'Start Reading' }).click();
  await page.getByRole('link', { name: 'Write a post' }).first().click();
  await page.getByRole('button', { name: 'Save post' }).click();
  await expect(page.getByText('Title is required.')).toBeVisible();
  await expect(page.getByText('Content is required.')).toBeVisible();
  await page.getByLabel('Title').fill('A browser note');
  await page.getByLabel('Content').fill('First line\n  second line');
  await expect(page.getByText('24 characters')).toBeVisible();
  await page.getByRole('button', { name: 'Save post' }).click();
  await expect(page.getByRole('heading', { name: 'A browser note' })).toBeVisible();
  const [created] = await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')));
  expect(created).toMatchObject({ title: 'A browser note', content: 'First line\n  second line', authorId: writer.userId, authorName: writer.displayName });
  expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt);
  await page.reload();
  await expect(page.getByText('First line', { exact: false })).toHaveCSS('white-space', 'pre-wrap');
  await page.getByRole('link', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Title').fill('Revised browser note');
  await page.getByRole('button', { name: 'Save post' }).click();
  await expect(page.getByRole('heading', { name: 'Revised browser note' })).toBeVisible();
  const [revised] = await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')));
  expect(revised).toEqual({ ...created, title: 'Revised browser note' });
  await page.getByRole('link', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Content').fill('Discard this');
  await page.getByRole('link', { name: 'Cancel' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([revised]);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'Revised browser note' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([revised]);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test('non-owner cannot edit or delete another writer’s post', async ({ page, browserErrors }) => {
  const record = { id: 'other', title: 'Another writer', content: 'Read only', createdAt: '2024-01-01T00:00:00.000Z', authorId: 'someone', authorName: 'Someone' };
  await page.goto('/');
  await page.evaluate(({ session, post }) => {
    localStorage.setItem('writespace_session', JSON.stringify(session));
    localStorage.setItem('writespace_posts', JSON.stringify([post]));
  }, { session: writer, post: record });
  await page.reload();
  await page.getByRole('link', { name: 'Another writer' }).click();
  await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([record]);
  expect(browserErrors).toEqual([]);
});

test('direct link to another writer’s editor redirects without changing the post', async ({ page, browserErrors }) => {
  const record = { id: 'other', title: 'Another writer', content: 'Read only', createdAt: '2024-01-01T00:00:00.000Z', authorId: 'someone', authorName: 'Someone' };
  await page.addInitScript(({ session, post }) => {
    localStorage.setItem('writespace_session', JSON.stringify(session));
    localStorage.setItem('writespace_posts', JSON.stringify([post]));
  }, { session: writer, post: record });
  await page.goto('/edit/other');
  await expect(page).toHaveURL(/\/blogs$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([record]);
  expect(browserErrors).toEqual([]);
});

test('damaged posts cannot be replaced by a new post', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((session) => {
    localStorage.setItem('writespace_session', JSON.stringify(session));
    localStorage.setItem('writespace_posts', '{broken');
  }, writer);
  await page.reload();
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Local posts are unavailable or damaged. Your stored data has not been changed.');
  await page.getByRole('link', { name: 'Start Reading' }).click();
  await page.getByRole('link', { name: 'Write a post' }).click();
  await page.getByLabel('Title').fill('Must not replace data');
  await page.getByLabel('Content').fill('Body');
  await page.getByRole('button', { name: 'Save post' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Local posts are unavailable or damaged. Your changes were not saved.');
  await expect(page).toHaveURL(/\/write$/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_posts'))).toBe('{broken');
});

test('failed post writes keep the editor and existing data intact', async ({ page }) => {
  const existing = { id: 'existing', title: 'Existing', content: 'Original', createdAt: '2024-01-01T00:00:00.000Z', authorId: 'writer', authorName: 'Ada Writer' };
  await page.goto('/');
  await page.evaluate(({ session, post }) => {
    localStorage.setItem('writespace_session', JSON.stringify(session));
    localStorage.setItem('writespace_posts', JSON.stringify([post]));
  }, { session: writer, post: existing });
  await page.reload();
  await page.getByRole('link', { name: 'Start Reading' }).click();
  await page.getByRole('link', { name: 'Edit Existing' }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'writespace_posts') throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByLabel('Title').fill('Unsaved change');
  await page.getByRole('button', { name: 'Save post' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Your changes were not saved. Check browser storage and try again.');
  await expect(page).toHaveURL(/\/edit\/existing$/);
  await expect(page.getByLabel('Title')).toHaveValue('Unsaved change');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([existing]);
  await page.getByRole('link', { name: 'Cancel' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('The post was not deleted. Check browser storage and try again.');
  await expect(page).toHaveURL(/\/blog\/existing$/);
  await expect(page.getByRole('heading', { name: 'Existing' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([existing]);
});

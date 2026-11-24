/** Exercise the local authoring journey and browser persistence. */
import { test, expect } from '@playwright/test';

const writer = { userId: 'writer', username: 'writer', displayName: 'Ada Writer', role: 'user' };

test('writer creates, edits, cancels and deletes a locally stored post', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.evaluate((session) => {
    localStorage.setItem('writespace_session', JSON.stringify(session));
    localStorage.setItem('writespace_posts', '[]');
  }, writer);
  await page.goto('/blogs');
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
  expect(errors).toEqual([]);
});

test('non-owner cannot edit or delete another writer’s post', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  const record = { id: 'other', title: 'Another writer', content: 'Read only', createdAt: '2024-01-01T00:00:00.000Z', authorId: 'someone', authorName: 'Someone' };
  await page.goto('/');
  await page.evaluate(({ session, post }) => {
    localStorage.setItem('writespace_session', JSON.stringify(session));
    localStorage.setItem('writespace_posts', JSON.stringify([post]));
  }, { session: writer, post: record });
  await page.goto('/blog/other');
  await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  await page.goto('/edit/other');
  await expect(page).toHaveURL(/\/blogs$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([record]);
  expect(errors).toEqual([]);
});

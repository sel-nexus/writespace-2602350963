/** Verify authoring interactions and browser-local mutation safeguards. */
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { deletePost, savePost } from '../utils/posts';

const writer = { userId: 'writer', username: 'writer', displayName: 'Ada Writer', role: 'user' };
const admin = { userId: 'admin-fixed', username: 'admin', displayName: 'Admin', role: 'admin' };
const original = { id: 'one', title: 'Original', content: 'First\n  line', createdAt: '2024-01-01T00:00:00.000Z', authorId: 'writer', authorName: 'Ada Writer', extra: 'preserve me' };
const other = { id: 'two', title: 'Other post', content: 'Other words', createdAt: '2024-02-01T00:00:00.000Z', authorId: 'other', authorName: 'Other' };

/** Render the actual route using browser-local fixtures. */
function renderApp(path, session = writer, records = [original, other]) {
  localStorage.setItem('writespace_session', JSON.stringify(session));
  if (records !== null) localStorage.setItem('writespace_posts', JSON.stringify(records));
  return render(<StrictMode><MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter></StrictMode>);
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('post authoring', () => {
  it('validates required fields, counts content and saves a UUID, timestamp and author', async () => {
    const user = userEvent.setup();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('550e8400-e29b-41d4-a716-446655440000');
    renderApp('/write', writer, []);
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Save post' }));
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Content is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    await user.type(screen.getByLabelText('Title'), 'My note');
    await user.type(screen.getByLabelText('Content'), 'Hello world');
    expect(screen.getByText('11 characters')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save post' }));
    const [post] = JSON.parse(localStorage.getItem('writespace_posts'));
    expect(post).toMatchObject({ id: '550e8400-e29b-41d4-a716-446655440000', title: 'My note', content: 'Hello world', authorId: 'writer', authorName: 'Ada Writer' });
    expect(new Date(post.createdAt).toISOString()).toBe(post.createdAt);
    expect(screen.getByRole('heading', { name: 'My note' })).toBeInTheDocument();
  });

  it('saves and displays HTML and script input as literal text', async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const title = '<b>Literal title</b>';
    const content = '<script>window.alert("executed")</script><img src="x" onerror="window.alert(1)"><strong>Literal body</strong>';
    renderApp('/write', writer, []);
    await user.click(screen.getByLabelText('Title'));
    await user.paste(title);
    await user.click(screen.getByLabelText('Content'));
    await user.paste(content);
    await user.click(screen.getByRole('button', { name: 'Save post' }));

    expect(JSON.parse(localStorage.getItem('writespace_posts'))[0]).toMatchObject({ title, content });
    const heading = screen.getByRole('heading', { name: title });
    const body = screen.getByText(content);
    expect(heading.textContent).toBe(title);
    expect(body.textContent).toBe(content);
    expect(heading.querySelector('b')).toBeNull();
    expect(body.querySelector('script, img, strong')).toBeNull();
    expect(alert).not.toHaveBeenCalled();
  });

  it('saves and displays representative large content without truncation', async () => {
    const user = userEvent.setup();
    const content = 'A substantial paragraph of plain text.\n'.repeat(1000) + 'End of post.';
    renderApp('/write', writer, []);
    await user.type(screen.getByLabelText('Title'), 'Long post');
    await user.click(screen.getByLabelText('Content'));
    await user.paste(content);
    expect(screen.getByLabelText('Content')).toHaveValue(content);
    expect(screen.getByText(`${content.length} characters`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save post' }));

    expect(JSON.parse(localStorage.getItem('writespace_posts'))[0].content).toBe(content);
    expect(screen.getByRole('heading', { name: 'Long post' })).toBeInTheDocument();
    expect(screen.getByText(content, { normalizer: (text) => text }).textContent).toBe(content);
  });

  it('cancels create and edit without writing changes', async () => {
    const user = userEvent.setup();
    renderApp('/edit/one');
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Unsaved');
    await user.click(screen.getByRole('link', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Original' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([original, other]);
    await user.click(screen.getByRole('link', { name: 'Write' }));
    await user.type(screen.getByLabelText('Title'), 'Discarded');
    await user.click(screen.getByRole('link', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([original, other]);
  });

  it('prefills and edits as admin, retaining identity, metadata, and other fresh records', async () => {
    const user = userEvent.setup();
    renderApp('/edit/one', admin, [original]);
    expect(screen.getByLabelText('Content')).toHaveValue(original.content);
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([original]);
    localStorage.setItem('writespace_posts', JSON.stringify([original, other]));
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Revised');
    await user.click(screen.getByRole('button', { name: 'Save post' }));
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([{ ...original, title: 'Revised' }, other]);
    expect(screen.getByRole('heading', { name: 'Revised' })).toBeInTheDocument();
  });

  it('redirects a non-owner and leaves another author read-only', () => {
    renderApp('/edit/two');
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
    cleanup();
    renderApp('/blog/two');
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([original, other]);
  });

  it('confirms deletion, preserves storage on cancel, and removes only the target on confirmation', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderApp('/blog/one');
    expect(confirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([original, other]);
    expect(screen.getByRole('heading', { name: 'Original' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([other]);
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
  });

  it('keeps the form and record when quota prevents saving or deleting', async () => {
    const user = userEvent.setup();
    renderApp('/edit/one');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Unsaved');
    await user.click(screen.getByRole('button', { name: 'Save post' }));
    expect(screen.getByRole('alert')).toHaveTextContent('not saved');
    expect(screen.getByLabelText('Title')).toHaveValue('Unsaved');
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([original, other]);
    await user.click(screen.getByRole('link', { name: 'Cancel' }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('alert')).toHaveTextContent('not deleted');
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([original, other]);
  });

  it('rejects malformed or unavailable storage rather than overwriting it', async () => {
    const user = userEvent.setup();
    localStorage.setItem('writespace_posts', '{bad');
    renderApp('/write', writer, null);
    await user.type(screen.getByLabelText('Title'), 'Title');
    await user.type(screen.getByLabelText('Content'), 'Text');
    await user.click(screen.getByRole('button', { name: 'Save post' }));
    expect(screen.getByRole('alert')).toHaveTextContent('not saved');
    expect(localStorage.getItem('writespace_posts')).toBe('{bad');
    expect(savePost({ title: 'X', content: 'Y' }).error).toBe('storage_read_failed');
    localStorage.setItem('writespace_posts', JSON.stringify([original, { id: 'bad' }]));
    expect(deletePost('one').error).toBe('storage_read_failed');
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([original, { id: 'bad' }]);
    const getItem = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === 'writespace_posts') throw new Error('blocked');
      return getItem.call(this, key);
    });
    expect(savePost({ title: 'X', content: 'Y' }).error).toBe('storage_read_failed');
  });

  it('rechecks current ownership, existence and identity for every mutation', () => {
    localStorage.setItem('writespace_session', JSON.stringify(writer));
    localStorage.setItem('writespace_posts', JSON.stringify([{ ...original, authorId: 'other' }]));
    expect(savePost({ title: 'Changed', content: 'Text' }, 'one').error).toBe('forbidden');
    expect(deletePost('one').error).toBe('forbidden');
    expect(savePost({ title: 'Changed', content: 'Text' }, 'missing').error).toBe('not_found');
    expect(deletePost('missing').error).toBe('not_found');
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([{ ...original, authorId: 'other' }]);
    localStorage.removeItem('writespace_session');
    expect(savePost({ title: 'Changed', content: 'Text' }).error).toBe('unauthenticated');
    expect(deletePost('one').error).toBe('unauthenticated');
  });

  it.each([
    ['title', 'omitted', undefined, true],
    ['title', 'undefined', undefined, false],
    ['title', 'null', null, false],
    ['title', 'number', 123, false],
    ['title', 'boolean', false, false],
    ['title', 'object', {}, false],
    ['title', 'array', [], false],
    ['title', 'empty string', '', false],
    ['title', 'whitespace', '  \n ', false],
    ['content', 'omitted', undefined, true],
    ['content', 'undefined', undefined, false],
    ['content', 'null', null, false],
    ['content', 'number', 123, false],
    ['content', 'boolean', false, false],
    ['content', 'object', {}, false],
    ['content', 'array', [], false],
    ['content', 'empty string', '', false],
    ['content', 'whitespace', '  \n ', false],
  ])('rejects %s as %s without changing localStorage', (field, _description, value, omitted) => {
    localStorage.setItem('writespace_session', JSON.stringify(writer));
    localStorage.setItem('writespace_posts', JSON.stringify([original, other]));
    localStorage.setItem('unrelated', 'keep this value');
    const before = Object.fromEntries(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)]));
    const input = { title: 'Valid title', content: 'Valid content', [field]: value };
    if (omitted) delete input[field];
    const message = field === 'title' ? 'Title is required.' : 'Content is required.';

    expect(savePost(input)).toEqual({ ok: false, error: 'validation', errors: { [field]: message } });
    expect(Object.fromEntries(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)]))).toEqual(before);
  });

  it('handles missing edit targets and whitespace-only input without writing', async () => {
    const user = userEvent.setup();
    renderApp('/edit/missing');
    expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
    cleanup();
    renderApp('/write');
    await user.type(screen.getByLabelText('Title'), '   ');
    await user.type(screen.getByLabelText('Content'), '   ');
    await user.click(screen.getByRole('button', { name: 'Save post' }));
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Content is required.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([original, other]);
  });

  it('lets admin delete another writer’s post and preserves newly added records', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderApp('/blog/one', admin, [original]);
    localStorage.setItem('writespace_posts', JSON.stringify([original, other]));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([other]);
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
  });

  it('rejects a changed owner at save time and a removed target at delete time', async () => {
    const user = userEvent.setup();
    renderApp('/edit/one');
    const changed = { ...original, authorId: 'other' };
    localStorage.setItem('writespace_posts', JSON.stringify([changed, other]));
    await user.click(screen.getByRole('button', { name: 'Save post' }));
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([changed, other]);
    cleanup();
    renderApp('/blog/one');
    localStorage.setItem('writespace_posts', JSON.stringify([other]));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([other]);
  });

  it('does not write when ID generation fails or yields a duplicate', () => {
    localStorage.setItem('writespace_session', JSON.stringify(writer));
    localStorage.setItem('writespace_posts', JSON.stringify([original]));
    const random = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => { throw new Error('unavailable'); });
    expect(savePost({ title: 'Valid', content: 'Text' }).error).toBe('id_unavailable');
    random.mockReturnValue('one');
    expect(savePost({ title: 'Valid', content: 'Text' }).error).toBe('id_unavailable');
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual([original]);
  });
});

/** Verify local reading, route policy, and explicit navigation actions. */
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { canManagePost, formatPostDate, newestPosts, postExcerpt } from '../utils/posts';

const writer = { userId: 'writer', username: 'writer', displayName: 'Ada Writer', role: 'user' };
const admin = { userId: 'admin-fixed', username: 'admin', displayName: 'Admin', role: 'admin' };
const posts = [
  { id: 'old', title: 'Old story', content: 'Earlier words', createdAt: '2024-01-01T12:00:00.000Z', authorId: 'other', authorName: 'Other Author' },
  { id: 'new', title: 'New story', content: `${'x'.repeat(120)} AFTER\n  second line`, createdAt: '2024-02-02T12:00:00.000Z', authorId: 'writer', authorName: 'Ada Writer' },
];

/** Seed local data and render the route inside the existing router. */
function renderApp(path, session = null, records = posts) {
  if (session) localStorage.setItem('writespace_session', JSON.stringify(session));
  if (records) localStorage.setItem('writespace_posts', JSON.stringify(records));
  return render(<StrictMode><MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter></StrictMode>);
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('post presentation helpers', () => {
  it('sorts a copy, formats dates, truncates previews and handles invalid records', () => {
    const input = [posts[0], null, posts[1], { id: 'broken' }];
    expect(newestPosts(input).map((post) => post.id)).toEqual(['new', 'old']);
    expect(input[0].id).toBe('old');
    expect(formatPostDate(posts[1].createdAt)).toBe('Feb 02, 2024');
    expect(formatPostDate('invalid')).toBe('Date unavailable');
    expect(formatPostDate(null)).toBe('Date unavailable');
    expect(postExcerpt(posts[1].content)).toBe('x'.repeat(120));
    expect(postExcerpt('short')).toBe('short');
  });

  it('permits admins and owners but not guests, non-owners or unknown roles', () => {
    expect(canManagePost(admin, posts[0])).toBe(true);
    expect(canManagePost(writer, posts[1])).toBe(true);
    expect(canManagePost(writer, posts[0])).toBe(false);
    expect(canManagePost(null, posts[1])).toBe(false);
    expect(canManagePost({ ...writer, role: 'other' }, posts[1])).toBe(false);
    expect(canManagePost(writer, null)).toBe(false);
  });
});

describe('protected routes', () => {
  it.each(['/blogs', '/blog/new', '/write', '/edit/new', '/admin', '/users'])('redirects a guest from %s to login', (path) => {
    renderApp(path);
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
  });

  it.each(['/admin', '/users'])('redirects a standard user from %s to blogs', (path) => {
    renderApp(path, writer);
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  });

  it.each(['/blogs', '/blog/new', '/write', '/edit/new', '/admin', '/users'])('allows an admin into %s', (path) => {
    renderApp(path, admin);
    expect(screen.queryByRole('heading', { name: 'Welcome back.' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    if (path === '/blog/new') expect(screen.getByRole('heading', { name: 'New story' })).toBeInTheDocument();
    if (path === '/admin' || path === '/users') expect(screen.getByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  });
});

describe('reading and navigation', () => {
  it('lists newest first with metadata, excerpt, cycling accents and owner-only edit', async () => {
    const user = userEvent.setup();
    renderApp('/blogs', writer);
    const cards = screen.getAllByRole('article');
    expect(within(cards[0]).getByRole('link', { name: 'New story' })).toBeInTheDocument();
    expect(within(cards[1]).getByRole('link', { name: 'Old story' })).toBeInTheDocument();
    expect(within(cards[0]).getByText('Feb 02, 2024')).toBeInTheDocument();
    expect(within(cards[0]).getByText('x'.repeat(120))).toBeInTheDocument();
    expect(within(cards[0]).queryByText(/AFTER/)).not.toBeInTheDocument();
    expect(within(cards[0]).getByLabelText('Ada Writer avatar')).toBeInTheDocument();
    expect(cards[0].className).not.toBe(cards[1].className);
    expect(screen.getByRole('link', { name: 'Edit New story' })).toHaveAttribute('href', '/edit/new');
    expect(screen.queryByRole('link', { name: 'Edit Old story' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'New story' }));
    expect(screen.getByRole('heading', { name: 'New story' })).toBeInTheDocument();
    const content = screen.getByText(/AFTER/);
    expect(content.textContent).toBe(posts[1].content);
    expect(content).toHaveClass('whitespace-pre-wrap');
    await user.click(screen.getByRole('link', { name: 'Back to blogs' }));
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
  });

  it('shows all edit links for admins and waits for edit activation', async () => {
    const user = userEvent.setup();
    renderApp('/blogs', admin);
    expect(screen.getByRole('link', { name: 'Edit New story' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Old story' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Edit Old story' }));
    expect(screen.getByText(/not available in the access-only build/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual(posts);
  });

  it('shows the exact missing state and returns to the list only when back is clicked', async () => {
    const user = userEvent.setup();
    renderApp('/blog/missing', writer);
    expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Back to blogs' }));
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
  });

  it('renders a distinct empty state and write link without navigating on mount', async () => {
    const user = userEvent.setup();
    renderApp('/blogs', writer, []);
    expect(screen.getByRole('heading', { name: 'No posts yet' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('link', { name: 'Write a post' })[0]);
    expect(screen.getByText(/not available in the access-only build/)).toBeInTheDocument();
  });

  it('does not replace malformed storage or call it empty', () => {
    localStorage.setItem('writespace_posts', '{bad');
    renderApp('/blogs', writer, null);
    expect(screen.getByRole('status')).toHaveTextContent('unavailable or damaged');
    expect(screen.queryByText('No posts yet')).not.toBeInTheDocument();
    expect(localStorage.getItem('writespace_posts')).toBe('{bad');
  });

  it('handles a throwing posts read in the reader without claiming a missing record', () => {
    const original = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === 'writespace_posts') throw new Error('blocked');
      return original.call(this, key);
    });
    renderApp('/blog/new', writer);
    expect(screen.getByRole('status')).toHaveTextContent('unavailable or damaged');
    expect(screen.queryByText('Post not found')).not.toBeInTheDocument();
  });

  it('toggles the mobile menu only on activation and logs out without deleting posts', async () => {
    const user = userEvent.setup();
    renderApp('/blogs', writer);
    const toggle = screen.getByRole('button', { name: 'Toggle navigation menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(localStorage.getItem('writespace_session')).not.toBeNull();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(localStorage.getItem('writespace_session')).toBeNull();
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual(posts);
    expect(screen.getByRole('heading', { name: /Your thoughts/ })).toBeInTheDocument();
  });
});

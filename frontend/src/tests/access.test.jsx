/** Exercise local access, routing and storage failures through observable behavior. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { readPosts, readUsers, writePosts, writeUsers } from '../utils/storage';
import { clearSession, login, readSession, register, writeSession } from '../utils/auth';

const form = { displayName: 'Ada Writer', username: 'ada', password: 'demo', confirmPassword: 'demo' };

/** Render the application at a chosen route. */
function renderApp(path = '/') {
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>);
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('storage results', () => {
  it('reads absent collections and persists valid posts and users', () => {
    expect(readPosts()).toEqual({ ok: true, value: [], error: null });
    expect(writePosts([{ id: 'one' }])).toEqual({ ok: true, error: null });
    expect(readPosts().value).toEqual([{ id: 'one' }]);
    expect(writeUsers([{ id: 'user' }]).ok).toBe(true);
    expect(readUsers().value).toEqual([{ id: 'user' }]);
  });

  it('classifies malformed JSON and non-array collections without changing them', () => {
    localStorage.setItem('writespace_posts', '{oops');
    localStorage.setItem('writespace_users', '{}');
    expect(readPosts()).toEqual({ ok: false, value: [], error: 'malformed' });
    expect(readUsers().error).toBe('malformed');
    expect(localStorage.getItem('writespace_posts')).toBe('{oops');
    expect(localStorage.getItem('writespace_users')).toBe('{}');
  });

  it('classifies inaccessible reads and writes instead of claiming success', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readPosts().error).toBe('unavailable');
    expect(readSession()).toEqual({ ok: false, value: null, error: 'unavailable' });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(writePosts([])).toEqual({ ok: false, error: 'unavailable' });
    expect(writeUsers([]).ok).toBe(false);
    expect(writeSession({}).ok).toBe(false);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(clearSession().ok).toBe(false);
  });

  it('rejects malformed sessions and clears only a valid session', () => {
    localStorage.setItem('writespace_session', JSON.stringify({ role: 'unknown' }));
    expect(readSession()).toEqual({ ok: false, value: null, error: 'malformed' });
    writeUsers([{ id: 'a' }]);
    writePosts([{ id: 'p' }]);
    const session = { userId: 'a', username: 'ada', displayName: 'Ada', role: 'user' };
    expect(writeSession(session).ok).toBe(true);
    expect(readSession().value).toEqual(session);
    expect(clearSession().ok).toBe(true);
    expect(readSession().value).toBeNull();
    expect(readUsers().value).toHaveLength(1);
    expect(readPosts().value).toHaveLength(1);
  });
});

describe('account operations', () => {
  it('registers a standard user with a UUID and timestamp, then logs in', () => {
    const result = register(form);
    expect(result.ok).toBe(true);
    expect(result.user).toMatchObject({ displayName: 'Ada Writer', username: 'ada', role: 'user' });
    expect(result.user.id).toMatch(/^[\da-f-]{36}$/i);
    expect(new Date(result.user.createdAt).toISOString()).toBe(result.user.createdAt);
    expect(readSession().value).toEqual(result.session);
    clearSession();
    expect(login('ada', 'demo')).toMatchObject({ ok: true, navigateTo: '/blogs' });
    expect(login('admin', 'admin')).toMatchObject({ ok: true, navigateTo: '/admin', session: { userId: 'admin-fixed', role: 'admin' } });
  });

  it('rejects missing, mismatched, reserved and duplicate credentials', () => {
    expect(register({ displayName: '', username: '', password: '', confirmPassword: '' }).errors).toHaveProperty('displayName');
    expect(register({ ...form, confirmPassword: 'other' }).errors).toHaveProperty('confirmPassword');
    expect(register({ ...form, username: 'admin' }).errors).toHaveProperty('username');
    register(form);
    expect(register(form).errors.username).toMatch(/already/);
    expect(login('ada', 'wrong')).toEqual({ ok: false, error: 'invalid_credentials' });
  });

  it('stops after read or account write failure and reports a partial session failure', () => {
    localStorage.setItem('writespace_users', 'bad');
    expect(register(form).error).toBe('storage_read_failed');
    expect(login('ada', 'demo').error).toBe('storage_read_failed');
    localStorage.removeItem('writespace_users');
    const original = Storage.prototype.setItem;
    const setter = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'writespace_users') throw new Error('quota');
      return original.call(this, key, value);
    });
    expect(register(form).error).toBe('account_write_failed');
    expect(readSession().value).toBeNull();
    setter.mockImplementation(function (key, value) {
      if (key === 'writespace_session') throw new Error('quota');
      return original.call(this, key, value);
    });
    expect(register(form).error).toBe('session_write_failed_account_saved');
    expect(readUsers().value).toHaveLength(1);
    expect(readSession().value).toBeNull();
    expect(login('admin', 'admin').error).toBe('session_write_failed');
  });
});

describe('public journeys', () => {
  it('shows disclosure and three newest local previews and sends a guest to login', async () => {
    const user = userEvent.setup();
    writePosts([1, 2, 3, 4].map((n) => ({ id: String(n), title: `Post ${n}`, content: `Content ${n}`, createdAt: `2024-01-0${n}T00:00:00.000Z` })));
    renderApp();
    expect(screen.getByText(/Passwords are plain text/)).toBeInTheDocument();
    expect(screen.queryByText('Post 1')).not.toBeInTheDocument();
    expect(screen.getByText('Post 4')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Post 4' }));
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
  });

  it('shows empty and damaged local post states distinctly', () => {
    const { unmount } = renderApp();
    expect(screen.getByText('No posts yet — check back soon!')).toBeInTheDocument();
    unmount();
    localStorage.setItem('writespace_posts', 'bad');
    renderApp();
    expect(screen.getByText(/Local posts are unavailable or damaged/)).toBeInTheDocument();
    expect(screen.queryByText('No posts yet — check back soon!')).not.toBeInTheDocument();
  });

  it('registers via the form, restores the session, and logs out without deleting the account', async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp('/register');
    await user.type(screen.getByLabelText('Display Name'), 'Ada Writer');
    await user.type(screen.getByLabelText('Username'), 'ada');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'demo');
    await user.type(screen.getByLabelText('Confirm Password'), 'demo');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
    unmount();
    renderApp('/login');
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(screen.getByRole('heading', { name: /Your thoughts/ })).toBeInTheDocument();
    expect(readUsers().value).toHaveLength(1);
    expect(readSession().value).toBeNull();
  });

  it('displays validation and invalid login without leaving the form', async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp('/register');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Display name is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Display Name')).toHaveAttribute('aria-invalid', 'true');
    unmount();
    renderApp('/login');
    await user.type(screen.getByLabelText('Username'), 'wrong');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password.');
    expect(readSession().value).toBeNull();
  });

  it('keeps the login screen and entered values when session persistence fails', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'admin');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByRole('alert')).toHaveTextContent('session could not be saved');
    expect(screen.getByLabelText('Username')).toHaveValue('admin');
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
  });

  it('explains when the account is saved but its session write fails', async () => {
    const user = userEvent.setup();
    renderApp('/register');
    await user.type(screen.getByLabelText('Display Name'), 'Ada Writer');
    await user.type(screen.getByLabelText('Username'), 'ada');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'demo');
    await user.type(screen.getByLabelText('Confirm Password'), 'demo');
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'writespace_session') throw new Error('quota');
      return original.call(this, key, value);
    });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Your account was saved, but the session could not be saved');
    expect(screen.getByLabelText('Username')).toHaveValue('ada');
    expect(readUsers().value).toHaveLength(1);
    expect(readSession().value).toBeNull();
  });

  it('reports a failed logout and leaves the existing session intact', async () => {
    const user = userEvent.setup();
    writeSession({ userId: 'a', username: 'ada', displayName: 'Ada', role: 'user' });
    renderApp('/blogs');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(screen.getByRole('alert')).toHaveTextContent('session could not be cleared');
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
    expect(readSession().value.username).toBe('ada');
  });

  it('redirects guests and restricts admin destinations for a standard session', () => {
    const { unmount } = renderApp('/users');
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
    unmount();
    writeSession({ userId: 'a', username: 'ada', displayName: 'Ada', role: 'user' });
    renderApp('/admin');
    expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
  });
});

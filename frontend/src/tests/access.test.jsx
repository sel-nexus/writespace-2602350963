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
    expect(login('ada', 'demo')).toEqual({ ok: false, error: 'invalid_credentials' });
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

  it.each([
    ['displayName', 'Display name is required.'],
    ['username', 'Username is required.'],
    ['password', 'Password is required.'],
    ['confirmPassword', 'Confirm your password.'],
  ])('rejects a missing %s without writing an account or session', (field, message) => {
    const input = { ...form };
    delete input[field];
    expect(register(input)).toMatchObject({ ok: false, error: 'validation', errors: { [field]: message } });
    expect(readUsers().value).toEqual([]);
    expect(readSession().value).toBeNull();
  });

  it.each(['displayName', 'username', 'password', 'confirmPassword'])('rejects invalid %s types at the registration boundary', (field) => {
    for (const value of [null, 123, {}, true, []]) {
      const result = register({ ...form, [field]: value });
      expect(result).toMatchObject({ ok: false, error: 'validation' });
      expect(result.errors).toHaveProperty(field);
      expect(readUsers().value).toEqual([]);
      expect(readSession().value).toBeNull();
    }
  });

  it.each([null, undefined, 4, 'bad', []])('rejects invalid registration form %s without crashing', (input) => {
    expect(register(input)).toMatchObject({ ok: false, error: 'validation' });
    expect(readUsers().value).toEqual([]);
    expect(readSession().value).toBeNull();
  });

  it('rejects blank values, mismatched confirmation, reserved and duplicate names without writing', () => {
    for (const field of ['displayName', 'username', 'password', 'confirmPassword']) {
      expect(register({ ...form, [field]: '   ' })).toMatchObject({ ok: false, error: 'validation', errors: { [field]: expect.any(String) } });
    }
    expect(register({ ...form, confirmPassword: 'other' })).toEqual({ ok: false, error: 'validation', errors: { confirmPassword: 'Passwords do not match.' } });
    expect(register({ ...form, username: ' AdMiN ' })).toEqual({ ok: false, error: 'validation', errors: { username: 'This username is reserved.' } });
    expect(register(form).ok).toBe(true);
    const saved = localStorage.getItem('writespace_users');
    const session = localStorage.getItem('writespace_session');
    expect(register({ ...form, username: ' ADA ' })).toEqual({ ok: false, error: 'validation', errors: { username: 'This username is already in use.' } });
    expect(localStorage.getItem('writespace_users')).toBe(saved);
    expect(localStorage.getItem('writespace_session')).toBe(session);
  });

  it('handles a UUID generation exception without writing', () => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => { throw new Error('unavailable'); });
    expect(register(form)).toEqual({ ok: false, error: 'id_unavailable' });
    expect(localStorage.getItem('writespace_users')).toBeNull();
    expect(localStorage.getItem('writespace_session')).toBeNull();
  });

  it.each(['existing-id', 'admin-fixed'])('refuses a generated ID collision with %s without writing', (id) => {
    writeUsers([{ id: 'existing-id', username: 'existing' }]);
    writeSession({ userId: 'existing-id', username: 'existing', displayName: 'Existing', role: 'user' });
    const users = localStorage.getItem('writespace_users');
    const session = localStorage.getItem('writespace_session');
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(id);
    expect(register(form)).toEqual({ ok: false, error: 'id_unavailable' });
    expect(localStorage.getItem('writespace_users')).toBe(users);
    expect(localStorage.getItem('writespace_session')).toBe(session);
  });

  it.each(['bad', '{}'])('uses an empty login collection for malformed users %s and preserves data', (raw) => {
    localStorage.setItem('writespace_users', raw);
    expect(login('ada', 'demo')).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(register(form)).toEqual({ ok: false, error: 'storage_read_failed' });
    expect(localStorage.getItem('writespace_users')).toBe(raw);
    expect(localStorage.getItem('writespace_session')).toBeNull();
  });

  it('treats an inaccessible user read as empty for login but refuses registration writes', () => {
    const original = Storage.prototype.getItem;
    const setter = vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === 'writespace_users') throw new Error('blocked');
      return original.call(this, key);
    });
    expect(login('ada', 'demo')).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(register(form)).toEqual({ ok: false, error: 'storage_read_failed' });
    expect(setter).not.toHaveBeenCalled();
    expect(readSession().value).toBeNull();
  });

  it('rejects invalid login input and incomplete stored identities without a session', () => {
    writeUsers([{ id: 'id', username: 123, password: true, displayName: 'Ada', role: 'user' }, { id: '', username: 'ada', password: 'demo', displayName: 'Ada', role: 'user' }]);
    expect(login(123, true)).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(login(null, null)).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(login('ada', 'demo')).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(readSession().value).toBeNull();
  });

  it('reports a stored-user login session write failure without altering the account', () => {
    expect(register(form).ok).toBe(true);
    clearSession();
    const saved = localStorage.getItem('writespace_users');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(login('ada', 'demo')).toEqual({ ok: false, error: 'session_write_failed' });
    expect(localStorage.getItem('writespace_users')).toBe(saved);
    expect(readSession().value).toBeNull();
  });

  it('allows the fixed admin login even when the user collection is unreadable', () => {
    localStorage.setItem('writespace_users', 'bad');
    expect(login('admin', 'admin')).toMatchObject({ ok: true, navigateTo: '/admin', session: { userId: 'admin-fixed' } });
    expect(localStorage.getItem('writespace_users')).toBe('bad');
    expect(readSession().value.userId).toBe('admin-fixed');
  });

  it('accepts stored admin roles and rejects unknown roles without creating a session', () => {
    writeUsers([{ id: 'a', username: 'ada', password: 'demo', displayName: 'Ada', role: 'admin' }]);
    expect(login('ada', 'demo')).toMatchObject({ ok: true, navigateTo: '/admin', session: { role: 'admin' } });
    clearSession();
    writeUsers([{ id: 'a', username: 'ada', password: 'demo', displayName: 'Ada', role: 'other' }]);
    expect(login('ada', 'demo')).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(readSession().value).toBeNull();
  });

  it('preserves existing users and session when the account write fails', () => {
    writeUsers([{ id: 'existing-id', username: 'existing' }]);
    writeSession({ userId: 'existing-id', username: 'existing', displayName: 'Existing', role: 'user' });
    const users = localStorage.getItem('writespace_users');
    const session = localStorage.getItem('writespace_session');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(register(form)).toEqual({ ok: false, error: 'account_write_failed' });
    expect(localStorage.getItem('writespace_users')).toBe(users);
    expect(localStorage.getItem('writespace_session')).toBe(session);
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

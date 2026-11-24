/** Verify admin screens and fresh browser-local account mutations. */
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { createAdminManagedUser, deleteAdminManagedUser } from '../utils/auth';

const admin = { userId: 'admin-fixed', username: 'admin', displayName: 'Admin', role: 'admin' };
const writer = { userId: 'writer', username: 'writer', displayName: 'Writer', role: 'user' };
const account = { id: 'local', username: 'local', displayName: 'Local', password: 'demo', role: 'admin', createdAt: '2024-01-01T00:00:00.000Z' };
const form = { displayName: 'New Person', username: 'new', password: 'demo', role: 'user' };
const posts = Array.from({ length: 6 }, (_, index) => ({ id: `p${index}`, title: `Post ${index}`, content: 'Text', createdAt: `2024-01-0${index + 1}T00:00:00.000Z`, authorId: 'writer', authorName: 'Writer' }));

/** Render a route in the real app with a selected local identity. */
function renderApp(path, session = admin) {
  if (session) localStorage.setItem('writespace_session', JSON.stringify(session));
  return render(<StrictMode><MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter></StrictMode>);
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('admin dashboard', () => {
  it('shows four slots, the newest five, links, and no action on render', async () => {
    localStorage.setItem('writespace_posts', JSON.stringify(posts));
    localStorage.setItem('writespace_users', JSON.stringify([account]));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderApp('/admin');
    const stats = screen.getByRole('region', { name: 'Local statistics' });
    expect(within(stats).getByText('Total Posts').nextSibling).toHaveTextContent('6');
    expect(within(stats).getByText('Total Users').nextSibling).toHaveTextContent('2');
    expect(within(stats).getByText('Total Admins').nextSibling).toHaveTextContent('2');
    expect(within(stats).getByText('Statistic pending clarification').nextSibling).toHaveTextContent('—');
    expect(screen.queryByRole('link', { name: 'Post 0' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Post 5' })).toHaveAttribute('href', '/blog/p5');
    expect(screen.getByRole('link', { name: 'Edit Post 5' })).toHaveAttribute('href', '/edit/p5');
    expect(screen.getByRole('link', { name: 'Write New Post' })).toHaveAttribute('href', '/write');
    expect(screen.getByRole('link', { name: 'Manage Users' })).toHaveAttribute('href', '/users');
    expect(confirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Post 5' }));
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual(posts);
    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Post 5' }));
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual(posts.slice(0, 5));
    expect(screen.getByText('Post deleted from this browser.')).toBeInTheDocument();
  });

  it('does not delete on a changed role or failed write and shows damaged storage', async () => {
    localStorage.setItem('writespace_posts', JSON.stringify(posts));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderApp('/admin');
    localStorage.setItem('writespace_session', JSON.stringify(writer));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Post 5' }));
    expect(screen.getByText(/Admin session is unavailable/)).toBeInTheDocument();
    localStorage.setItem('writespace_session', JSON.stringify(admin));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await userEvent.click(screen.getByRole('button', { name: 'Delete Post 5' }));
    expect(screen.getByText(/post was not deleted/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('writespace_posts'))).toEqual(posts);
    cleanup();
    vi.restoreAllMocks();
    localStorage.setItem('writespace_posts', '{bad');
    localStorage.setItem('writespace_users', '{bad');
    renderApp('/admin');
    expect(screen.getByText(/Local posts are unavailable or damaged/)).toBeInTheDocument();
    expect(screen.getByText(/Local accounts are unavailable or damaged/)).toBeInTheDocument();
    expect(localStorage.getItem('writespace_users')).toBe('{bad');
  });

  it('redirects guests and standard users from both admin routes', () => {
    for (const path of ['/admin', '/users']) {
      renderApp(path, null);
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      cleanup();
      renderApp(path, writer);
      expect(screen.getByRole('heading', { name: 'Your reading space' })).toBeInTheDocument();
      cleanup();
      localStorage.clear();
    }
  });
});

describe('local accounts', () => {
  it('validates and creates either role, persists identity and reloads it', async () => {
    const user = userEvent.setup();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('550e8400-e29b-41d4-a716-446655440000');
    renderApp('/users');
    await user.click(screen.getByRole('button', { name: 'Create user' }));
    expect(screen.getByText('Display name is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
    await user.type(screen.getByLabelText('Display name'), 'Local Admin');
    await user.type(screen.getByLabelText('Username'), 'newadmin');
    await user.type(screen.getByLabelText('Password'), 'demo');
    await user.selectOptions(screen.getByLabelText('Role'), 'admin');
    await user.click(screen.getByRole('button', { name: 'Create user' }));
    const [created] = JSON.parse(localStorage.getItem('writespace_users'));
    expect(created).toMatchObject({ id: '550e8400-e29b-41d4-a716-446655440000', displayName: 'Local Admin', username: 'newadmin', password: 'demo', role: 'admin' });
    expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt);
    expect(screen.getByText('Account saved in this browser.')).toBeInTheDocument();
    cleanup();
    renderApp('/users');
    expect(screen.getByText('@newadmin')).toBeInTheDocument();
  });

  it('protects built-in and active accounts and requires confirmation for others', async () => {
    localStorage.setItem('writespace_users', JSON.stringify([account]));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderApp('/users');
    expect(screen.getByRole('button', { name: 'Delete admin' })).toBeDisabled();
    expect(confirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete local' }));
    expect(JSON.parse(localStorage.getItem('writespace_users'))).toEqual([account]);
    await userEvent.click(screen.getByRole('button', { name: 'Delete local' }));
    expect(JSON.parse(localStorage.getItem('writespace_users'))).toEqual([]);
    cleanup();
    localStorage.setItem('writespace_users', JSON.stringify([account]));
    renderApp('/users', { userId: account.id, username: account.username, displayName: account.displayName, role: 'admin' });
    expect(screen.getByRole('button', { name: 'Delete local' })).toBeDisabled();
    expect(deleteAdminManagedUser('local', true).error).toBe('protected');
  });

  it('checks role, confirmation, unique and reserved names, current data and identity', () => {
    expect(createAdminManagedUser(form).error).toBe('unauthenticated');
    localStorage.setItem('writespace_session', JSON.stringify(writer));
    expect(createAdminManagedUser(form).error).toBe('forbidden');
    expect(deleteAdminManagedUser('local', true).error).toBe('forbidden');
    localStorage.setItem('writespace_session', JSON.stringify(admin));
    localStorage.setItem('writespace_users', JSON.stringify([account]));
    expect(createAdminManagedUser({ ...form, username: 'AdMiN' }).errors.username).toMatch(/reserved/);
    expect(createAdminManagedUser({ ...form, username: 'LOCAL' }).errors.username).toMatch(/already/);
    expect(createAdminManagedUser({ ...form, role: 'root' }).errors.role).toBeTruthy();
    expect(deleteAdminManagedUser('local', false).error).toBe('cancelled');
    expect(deleteAdminManagedUser('admin-fixed', true).error).toBe('protected');
    expect(deleteAdminManagedUser('missing', true).error).toBe('not_found');
    const random = vi.spyOn(crypto, 'randomUUID').mockReturnValue('local');
    expect(createAdminManagedUser(form).error).toBe('id_unavailable');
    random.mockImplementation(() => { throw new Error('unavailable'); });
    expect(createAdminManagedUser(form).error).toBe('id_unavailable');
    expect(JSON.parse(localStorage.getItem('writespace_users'))).toEqual([account]);
  });

  it('preserves newly added records and rejects malformed, unavailable and quota storage', () => {
    localStorage.setItem('writespace_session', JSON.stringify(admin));
    localStorage.setItem('writespace_users', JSON.stringify([account]));
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('new-id');
    expect(createAdminManagedUser(form).ok).toBe(true);
    expect(JSON.parse(localStorage.getItem('writespace_users'))).toHaveLength(2);
    expect(deleteAdminManagedUser('local', true).ok).toBe(true);
    expect(JSON.parse(localStorage.getItem('writespace_users'))[0].username).toBe('new');
    localStorage.setItem('writespace_users', '{bad');
    expect(createAdminManagedUser(form).error).toBe('storage_read_failed');
    expect(deleteAdminManagedUser('local', true).error).toBe('storage_read_failed');
    expect(localStorage.getItem('writespace_users')).toBe('{bad');
    localStorage.setItem('writespace_users', JSON.stringify([account, { id: 'broken' }]));
    expect(createAdminManagedUser(form).error).toBe('storage_read_failed');
    localStorage.setItem('writespace_users', JSON.stringify([account]));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(createAdminManagedUser(form).error).toBe('storage_write_failed');
    expect(deleteAdminManagedUser('local', true).error).toBe('storage_write_failed');
    expect(JSON.parse(localStorage.getItem('writespace_users'))).toEqual([account]);
    const getItem = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === 'writespace_users') throw new Error('blocked');
      return getItem.call(this, key);
    });
    expect(createAdminManagedUser(form).error).toBe('storage_read_failed');
  });

  it('keeps form values and reports write failure without a success message', async () => {
    const user = userEvent.setup();
    renderApp('/users');
    await user.type(screen.getByLabelText('Display name'), 'Example');
    await user.type(screen.getByLabelText('Username'), 'example');
    await user.type(screen.getByLabelText('Password'), 'demo');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await user.click(screen.getByRole('button', { name: 'Create user' }));
    expect(screen.getByText(/Account was not saved/)).toBeInTheDocument();
    expect(screen.queryByText('Account saved in this browser.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveValue('example');
    expect(localStorage.getItem('writespace_users')).toBeNull();
  });
});

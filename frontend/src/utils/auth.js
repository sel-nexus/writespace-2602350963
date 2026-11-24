/** Manage demo identities and the browser-local session. */
import { readUsers, writeUsers } from './storage';

const SESSION_KEY = 'writespace_session';
const ADMIN = { userId: 'admin-fixed', username: 'admin', displayName: 'Admin', role: 'admin' };

/** Read a valid session or classify an inaccessible or damaged one.
 * @returns {{ok: boolean, value: object|null, error: string|null}} Read result.
 */
export function readSession() {
  let raw;
  try { raw = localStorage.getItem(SESSION_KEY); }
  catch { return { ok: false, value: null, error: 'unavailable' }; }
  if (raw === null) return { ok: true, value: null, error: null };
  try {
    const value = JSON.parse(raw);
    const valid = value && ['userId', 'username', 'displayName'].every((key) => typeof value[key] === 'string' && value[key].trim()) && ['admin', 'user'].includes(value.role);
    return valid ? { ok: true, value, error: null } : { ok: false, value: null, error: 'malformed' };
  } catch { return { ok: false, value: null, error: 'malformed' }; }
}

/** Persist the active identity and return an honest write result. */
export function writeSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, error: null };
  } catch { return { ok: false, error: 'unavailable' }; }
}

/** Remove only the active identity and report any storage failure. */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    return { ok: true, error: null };
  } catch { return { ok: false, error: 'unavailable' }; }
}

/** Select the home path for an authenticated role. */
export function getRoleHome(session) { return session.role === 'admin' ? '/admin' : '/blogs'; }

/** Authenticate demo credentials and persist the resulting session.
 * @returns {object} A session and destination, or a classified failure.
 */
export function login(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') return { ok: false, error: 'invalid_credentials' };
  let session;
  if (username === 'admin' && password === 'admin') {
    session = ADMIN;
  } else {
    const users = readUsers();
    const user = (users.ok ? users.value : []).find((item) => item && item.username === username && item.password === password && ['admin', 'user'].includes(item.role));
    if (!user) return { ok: false, error: 'invalid_credentials' };
    session = { userId: user.id, username: user.username, displayName: user.displayName, role: user.role };
    if (![session.userId, session.username, session.displayName].every((value) => typeof value === 'string' && value.trim())) return { ok: false, error: 'invalid_credentials' };
  }
  if (!writeSession(session).ok) return { ok: false, error: 'session_write_failed' };
  return { ok: true, session, navigateTo: getRoleHome(session) };
}

/** Register a standard account before attempting its session write.
 * @param {object} form Submitted demo account values.
 * @returns {object} Created identity or a classified failure.
 */
export function register(form) {
  const displayName = typeof form?.displayName === 'string' ? form.displayName.trim() : '';
  const username = typeof form?.username === 'string' ? form.username.trim() : '';
  const errors = {};
  if (!displayName) errors.displayName = 'Display name is required.';
  if (!username) errors.username = 'Username is required.';
  if (typeof form?.password !== 'string' || !form.password.trim()) errors.password = 'Password is required.';
  if (typeof form?.confirmPassword !== 'string' || !form.confirmPassword.trim()) errors.confirmPassword = 'Confirm your password.';
  else if (!errors.password && form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (username.toLowerCase() === 'admin') errors.username = 'This username is reserved.';
  if (Object.keys(errors).length) return { ok: false, error: 'validation', errors };
  const users = readUsers();
  if (!users.ok) return { ok: false, error: 'storage_read_failed' };
  if (users.value.some((user) => user && typeof user.username === 'string' && user.username.toLowerCase() === username.toLowerCase())) return { ok: false, error: 'validation', errors: { username: 'This username is already in use.' } };
  let id;
  try { id = crypto.randomUUID(); }
  catch { return { ok: false, error: 'id_unavailable' }; }
  if (id === ADMIN.userId || users.value.some((user) => user && user.id === id)) return { ok: false, error: 'id_unavailable' };
  const user = { id, displayName, username, password: form.password, role: 'user', createdAt: new Date().toISOString() };
  if (!writeUsers([...users.value, user]).ok) return { ok: false, error: 'account_write_failed' };
  const session = { userId: id, username, displayName, role: 'user' };
  if (!writeSession(session).ok) return { ok: false, error: 'session_write_failed_account_saved' };
  return { ok: true, user, session, navigateTo: '/blogs' };
}

/** Read complete, unambiguous account records before an admin mutation. */
export function readManagedUsers() {
  const result = readUsers();
  if (!result.ok) return result;
  const ids = new Set();
  const names = new Set();
  const valid = result.value.every((user) => {
    if (!user || typeof user !== 'object' || Array.isArray(user)) return false;
    if (!['id', 'displayName', 'username', 'password', 'createdAt'].every((key) => typeof user[key] === 'string' && user[key].trim())) return false;
    if (!['admin', 'user'].includes(user.role) || Number.isNaN(Date.parse(user.createdAt))) return false;
    const name = user.username.toLowerCase();
    if (ids.has(user.id) || names.has(name)) return false;
    ids.add(user.id);
    names.add(name);
    return true;
  });
  return valid ? result : { ok: false, value: [], error: 'malformed' };
}

/** Create a browser-local account only for the current admin session. */
export function createAdminManagedUser(form) {
  const session = readSession();
  if (!session.ok || !session.value) return { ok: false, error: 'unauthenticated' };
  if (session.value.role !== 'admin') return { ok: false, error: 'forbidden' };
  const displayName = typeof form?.displayName === 'string' ? form.displayName.trim() : '';
  const username = typeof form?.username === 'string' ? form.username.trim() : '';
  const errors = {};
  if (!displayName) errors.displayName = 'Display name is required.';
  if (!username) errors.username = 'Username is required.';
  else if (username.toLowerCase() === 'admin') errors.username = 'This username is reserved.';
  if (typeof form?.password !== 'string' || !form.password.trim()) errors.password = 'Password is required.';
  if (!['admin', 'user'].includes(form?.role)) errors.role = 'Choose a valid role.';
  if (Object.keys(errors).length) return { ok: false, error: 'validation', errors };
  const users = readManagedUsers();
  if (!users.ok) return { ok: false, error: 'storage_read_failed' };
  if (users.value.some((user) => user.username.toLowerCase() === username.toLowerCase())) return { ok: false, error: 'validation', errors: { username: 'This username is already in use.' } };
  let id;
  try { id = crypto.randomUUID(); } catch { return { ok: false, error: 'id_unavailable' }; }
  if (id === ADMIN.userId || users.value.some((user) => user.id === id)) return { ok: false, error: 'id_unavailable' };
  const user = { id, displayName, username, password: form.password, role: form.role, createdAt: new Date().toISOString() };
  if (!writeUsers([...users.value, user]).ok) return { ok: false, error: 'storage_write_failed' };
  return { ok: true, user, users: [...users.value, user] };
}

/** Delete a local account after explicit confirmation and fresh checks. */
export function deleteAdminManagedUser(id, confirmed) {
  const session = readSession();
  if (!session.ok || !session.value) return { ok: false, error: 'unauthenticated' };
  if (session.value.role !== 'admin') return { ok: false, error: 'forbidden' };
  if (id === ADMIN.userId || id === session.value.userId) return { ok: false, error: 'protected' };
  if (confirmed !== true) return { ok: false, error: 'cancelled' };
  const users = readManagedUsers();
  if (!users.ok) return { ok: false, error: 'storage_read_failed' };
  const target = users.value.find((user) => user.id === id);
  if (!target) return { ok: false, error: 'not_found' };
  if (target.username.toLowerCase() === 'admin') return { ok: false, error: 'protected' };
  const next = users.value.filter((user) => user.id !== id);
  if (!writeUsers(next).ok) return { ok: false, error: 'storage_write_failed' };
  return { ok: true, deletedId: id, users: next };
}

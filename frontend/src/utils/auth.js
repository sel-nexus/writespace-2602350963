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
  let session;
  if (username === 'admin' && password === 'admin') {
    session = ADMIN;
  } else {
    const users = readUsers();
    if (!users.ok) return { ok: false, error: 'storage_read_failed' };
    const user = users.value.find((item) => item && item.username === username && item.password === password && ['admin', 'user'].includes(item.role));
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
  const displayName = form.displayName.trim();
  const username = form.username.trim();
  const errors = {};
  if (!displayName) errors.displayName = 'Display name is required.';
  if (!username) errors.username = 'Username is required.';
  if (!form.password) errors.password = 'Password is required.';
  if (!form.confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (username.toLowerCase() === 'admin') errors.username = 'This username is reserved.';
  if (Object.keys(errors).length) return { ok: false, error: 'validation', errors };
  const users = readUsers();
  if (!users.ok) return { ok: false, error: 'storage_read_failed' };
  if (users.value.some((user) => user && user.username === username)) return { ok: false, error: 'validation', errors: { username: 'This username is already in use.' } };
  let id;
  try { id = crypto.randomUUID(); }
  catch { return { ok: false, error: 'id_unavailable' }; }
  const user = { id, displayName, username, password: form.password, role: 'user', createdAt: new Date().toISOString() };
  if (!writeUsers([...users.value, user]).ok) return { ok: false, error: 'account_write_failed' };
  const session = { userId: id, username, displayName, role: 'user' };
  if (!writeSession(session).ok) return { ok: false, error: 'session_write_failed_account_saved' };
  return { ok: true, user, session, navigateTo: '/blogs' };
}

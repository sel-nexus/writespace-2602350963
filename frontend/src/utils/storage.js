/** Read and write the browser-local post and account collections. */

/** Read a collection without overwriting damaged data.
 * @param {string} key Storage key.
 * @returns {{ok: boolean, value: Array, error: string|null}} Classified result.
 */
function readCollection(key) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return { ok: false, value: [], error: 'unavailable' };
  }
  if (raw === null) return { ok: true, value: [], error: null };
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? { ok: true, value, error: null }
      : { ok: false, value: [], error: 'malformed' };
  } catch {
    return { ok: false, value: [], error: 'malformed' };
  }
}

/** Persist a collection and report whether the write succeeded.
 * @param {string} key Storage key.
 * @param {Array} value Records to serialize.
 * @returns {{ok: boolean, error: string|null}} Write result.
 */
function writeCollection(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

/** Read the local posts. */
export function readPosts() { return readCollection('writespace_posts'); }
/** Persist the local posts. */
export function writePosts(posts) { return writeCollection('writespace_posts', posts); }
/** Read the local accounts. */
export function readUsers() { return readCollection('writespace_users'); }
/** Persist the local accounts. */
export function writeUsers(users) { return writeCollection('writespace_users', users); }

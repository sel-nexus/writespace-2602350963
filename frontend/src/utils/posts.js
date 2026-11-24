/** Derive presentation values and perform guarded browser-local post mutations. */
import { readSession } from './auth';
import { readPosts, writePosts } from './storage';

/** Return renderable posts in newest-first order without changing the input.
 * @param {Array} posts Browser-local records.
 * @returns {Array} A sorted copy of readable records.
 */
export function newestPosts(posts) {
  return posts.filter((post) => post && typeof post.id === 'string' && typeof post.title === 'string' && typeof post.content === 'string')
    .slice().sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

/** Format a post date consistently, or describe an invalid date.
 * @param {string} value Creation timestamp.
 * @returns {string} Readable date or fallback.
 */
export function formatPostDate(value) {
  if (typeof value !== 'string' || !value.trim()) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

/** Return the initial 120 characters of a post's plain text.
 * @param {string} content Post content.
 * @returns {string} Preview text.
 */
export function postExcerpt(content) { return content.slice(0, 120); }

/** Determine whether a signed-in user may manage a post.
 * @param {object|null} session Active identity.
 * @param {object} post Post to check.
 * @returns {boolean} Whether the role or ownership permits management.
 */
export function canManagePost(session, post) {
  return Boolean(session && post && (session.role === 'admin' || (session.role === 'user' && typeof post.authorId === 'string' && session.userId === post.authorId)));
}

/** Read a complete, unambiguous collection before allowing a mutation. */
export function readEditablePosts() {
  const result = readPosts();
  if (!result.ok) return result;
  const ids = new Set();
  const valid = result.value.every((post) => {
    if (!post || typeof post !== 'object' || Array.isArray(post)) return false;
    if (!['id', 'title', 'content', 'createdAt', 'authorId', 'authorName'].every((key) => typeof post[key] === 'string' && post[key].trim())) return false;
    if (Number.isNaN(Date.parse(post.createdAt)) || ids.has(post.id)) return false;
    ids.add(post.id);
    return true;
  });
  return valid ? result : { ok: false, value: [], error: 'malformed' };
}

/** Validate submitted text and retain its original whitespace. */
export function validatePost(input) {
  const errors = {};
  if (typeof input?.title !== 'string' || !input.title.trim()) errors.title = 'Title is required.';
  if (typeof input?.content !== 'string' || !input.content.trim()) errors.content = 'Content is required.';
  return errors;
}

/** Persist a new or existing post using a fresh identity and collection. */
export function savePost(input, id = null) {
  const errors = validatePost(input);
  if (Object.keys(errors).length) return { ok: false, error: 'validation', errors };
  const session = readSession();
  if (!session.ok || !session.value) return { ok: false, error: 'unauthenticated' };
  const current = readEditablePosts();
  if (!current.ok) return { ok: false, error: 'storage_read_failed' };
  let post;
  let next;
  if (id !== null) {
    const existing = current.value.find((item) => item.id === id);
    if (!existing) return { ok: false, error: 'not_found' };
    if (!canManagePost(session.value, existing)) return { ok: false, error: 'forbidden' };
    post = { ...existing, title: input.title, content: input.content };
    next = current.value.map((item) => item.id === id ? post : item);
  } else {
    let newId;
    try { newId = crypto.randomUUID(); }
    catch { return { ok: false, error: 'id_unavailable' }; }
    if (current.value.some((item) => item.id === newId)) return { ok: false, error: 'id_unavailable' };
    post = { id: newId, title: input.title, content: input.content, createdAt: new Date().toISOString(), authorId: session.value.userId, authorName: session.value.displayName };
    next = [...current.value, post];
  }
  if (!writePosts(next).ok) return { ok: false, error: 'storage_write_failed' };
  return { ok: true, post };
}

/** Delete a currently authorized post after the caller confirms the action. */
export function deletePost(id) {
  const session = readSession();
  if (!session.ok || !session.value) return { ok: false, error: 'unauthenticated' };
  const current = readEditablePosts();
  if (!current.ok) return { ok: false, error: 'storage_read_failed' };
  const post = current.value.find((item) => item.id === id);
  if (!post) return { ok: false, error: 'not_found' };
  if (!canManagePost(session.value, post)) return { ok: false, error: 'forbidden' };
  if (!writePosts(current.value.filter((item) => item.id !== id)).ok) return { ok: false, error: 'storage_write_failed' };
  return { ok: true };
}

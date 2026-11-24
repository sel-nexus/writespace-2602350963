/** Derive safe presentation values for browser-local posts. */

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

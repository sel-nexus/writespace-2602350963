/** Render a full local post as plain text. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { canManagePost, deletePost, formatPostDate, newestPosts } from '../utils/posts';
import { readPosts } from '../utils/storage';

/** Show a post, a missing-record state, or a storage failure. */
export default function ReadBlog({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [failure, setFailure] = useState('');
  const result = readPosts();
  const post = newestPosts(result.value).find((item) => item.id === id);
  const author = typeof post?.authorName === 'string' && post.authorName.trim() ? post.authorName : 'Unknown author';

  /** Confirm deletion and navigate only after the fresh mutation succeeds. */
  function handleDelete() {
    if (!window.confirm('Delete this post?')) return;
    const deletion = deletePost(id);
    if (deletion.ok) { navigate('/blogs'); return; }
    if (deletion.error === 'unauthenticated') { navigate('/login', { replace: true }); return; }
    if (deletion.error === 'forbidden') { navigate('/blogs', { replace: true }); return; }
    setFailure(deletion.error);
  }
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <Link to="/blogs" className="font-semibold text-indigo-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">Back to blogs</Link>
      {!result.ok ? (
        <p role="status" className="mt-8 text-slate-700">Local posts are unavailable or damaged. Your stored data has not been changed.</p>
      ) : !post || failure === 'not_found' ? (
        <h1 className="mt-8 font-serif text-4xl text-slate-900">Post not found</h1>
      ) : (
        <article className="mt-8">
          <h1 className="break-words font-serif text-4xl tracking-tight text-slate-900 sm:text-5xl">{post.title}</h1>
          <div className="mt-6 flex items-center gap-3">
            <Avatar displayName={author} />
            <div>
              <p className="font-semibold text-slate-800">{author}</p>
              <time className="text-sm text-slate-600">{formatPostDate(post.createdAt)}</time>
            </div>
          </div>
          <div className="mt-10 whitespace-pre-wrap break-words text-lg leading-8 text-slate-700">{post.content}</div>
          {canManagePost(session, post) && (
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to={`/edit/${encodeURIComponent(post.id)}`} className="rounded-lg border border-indigo-200 px-4 py-2 font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">Edit</Link>
              <button type="button" onClick={handleDelete} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700">Delete</button>
            </div>
          )}
          {failure && failure !== 'not_found' && <p role="alert" className="mt-4 text-red-700">{failure === 'storage_read_failed' ? 'Local posts are unavailable or damaged. The post was not deleted.' : 'The post was not deleted. Check browser storage and try again.'}</p>}
        </article>
      )}
    </main>
  );
}
ReadBlog.propTypes = { session: PropTypes.object };

/** Create and revise browser-local plain-text posts. */
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { readSession } from '../utils/auth';
import { canManagePost, readEditablePosts, savePost } from '../utils/posts';

/** Display an editor with field validation and explicit save and cancel actions. */
export default function WriteBlog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initial] = useState(() => {
    if (!id) return { post: null };
    const session = readSession();
    if (!session.ok || !session.value) return { error: 'unauthenticated' };
    const result = readEditablePosts();
    if (!result.ok) return { error: 'storage_read_failed' };
    const post = result.value.find((item) => item.id === id);
    if (!post) return { error: 'not_found' };
    if (!canManagePost(session.value, post)) return { error: 'forbidden' };
    return { post };
  });
  const [title, setTitle] = useState(initial.post?.title || '');
  const [content, setContent] = useState(initial.post?.content || '');
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(initial.error || '');

  /** Save only after validation, fresh storage reads, and authorization. */
  function handleSubmit(event) {
    event.preventDefault();
    const result = savePost({ title, content }, id || null);
    if (result.ok) {
      navigate(`/blog/${encodeURIComponent(result.post.id)}`);
      return;
    }
    if (result.error === 'forbidden') { navigate('/blogs', { replace: true }); return; }
    if (result.error === 'unauthenticated') { navigate('/login', { replace: true }); return; }
    setErrors(result.errors || {});
    setFailure(result.error === 'validation' ? '' : result.error);
  }

  if (initial.error === 'unauthenticated') return <Navigate to="/login" replace />;
  if (initial.error === 'forbidden') return <Navigate to="/blogs" replace />;
  if (failure === 'not_found') {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <Link to="/blogs" className="font-semibold text-indigo-700 underline">Back to blogs</Link>
        <h1 className="mt-8 font-serif text-4xl text-slate-900">Post not found</h1>
      </main>
    );
  }
  if (initial.error === 'storage_read_failed') {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <Link to="/blogs" className="font-semibold text-indigo-700 underline">Back to blogs</Link>
        <p role="alert" className="mt-8 text-slate-700">Local posts are unavailable or damaged. Your stored data has not been changed.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-sm font-semibold text-indigo-700">Your writing space</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight text-slate-900 sm:text-5xl">
        {id ? 'Edit post' : 'Write a post'}
      </h1>
      <p className="mt-3 text-slate-600">Plain text is saved only in this browser. Do not use sensitive content.</p>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="post-title" className="block font-semibold text-slate-800">Title</label>
          <input
            id="post-title"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline focus:outline-2 focus:outline-indigo-700"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-required="true"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'title-error' : undefined}
          />
          {errors.title && <p id="title-error" role="alert" className="mt-2 text-sm text-red-700">
            {errors.title}
          </p>}
        </div>
        <div>
          <label htmlFor="post-content" className="block font-semibold text-slate-800">Content</label>
          <textarea
            id="post-content"
            className="mt-2 min-h-64 w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline focus:outline-2 focus:outline-indigo-700"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            aria-required="true"
            aria-invalid={Boolean(errors.content)}
            aria-describedby={errors.content ? 'content-count content-error' : 'content-count'}
          />
          <p id="content-count" className="mt-2 text-sm text-slate-600">{content.length} characters</p>
          {errors.content && <p id="content-error" role="alert" className="mt-2 text-sm text-red-700">
            {errors.content}
          </p>}
        </div>
        {failure && <p role="alert" className="text-red-700">
          {failure === 'storage_read_failed' ? 'Local posts are unavailable or damaged. Your changes were not saved.' : failure === 'id_unavailable' ? 'A new post ID could not be generated. Your changes were not saved.' : 'Your changes were not saved. Check browser storage and try again.'}
        </p>}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
          >Save post</button>
          <Link
            to={id ? `/blog/${encodeURIComponent(id)}` : '/blogs'}
            className="rounded-lg px-5 py-3 font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-700"
          >Cancel</Link>
        </div>
      </form>
    </main>
  );
}

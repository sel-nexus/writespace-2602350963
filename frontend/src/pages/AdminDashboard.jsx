/** Display a browser-local administrative overview. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { readManagedUsers, readSession } from '../utils/auth';
import { deletePost, formatPostDate, newestPosts, readEditablePosts } from '../utils/posts';

/** Render local totals, recent posts and explicitly activated controls. */
export default function AdminDashboard() {
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const postsResult = readEditablePosts();
  const usersResult = readManagedUsers();
  const posts = newestPosts(postsResult.value);
  const users = usersResult.value;
  const count = (value, ok) => ok ? value : 'Unavailable';

  /** Confirm and delete using the current admin identity and fresh post data. */
  function handleDelete(post) {
    if (!window.confirm(`Delete “${post.title}”?`)) return;
    const current = readSession();
    if (!current.ok || current.value?.role !== 'admin') {
      setNotice('Admin session is unavailable. The post was not deleted.');
      return;
    }
    const result = deletePost(post.id);
    if (!result.ok) {
      setNotice('The post was not deleted. It may have changed or browser storage may be unavailable.');
      return;
    }
    setNotice('Post deleted from this browser.');
    setRevision((value) => value + 1);
  }
  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16" data-revision={revision}>
      <div className="rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 p-7 text-white sm:p-10">
        <p className="text-sm font-semibold text-violet-100">WriteSpace administration</p>
        <h1 className="mt-3 font-serif text-4xl">Admin dashboard</h1>
        <p className="mt-3 max-w-2xl text-violet-50">Manage posts and accounts stored in this browser.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/write" className="rounded-lg bg-white px-4 py-2 font-semibold text-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Write New Post</Link>
          <Link to="/users" className="rounded-lg border border-white px-4 py-2 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Manage Users</Link>
        </div>
      </div>
      <p className="mt-5 text-sm text-slate-700">Demo only: data and plaintext passwords stay in this browser, are not encrypted, and client-side roles are not security. Do not use real passwords or sensitive content.</p>
      <section aria-label="Local statistics" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Posts" value={count(posts.length, postsResult.ok)} />
        <StatCard label="Total Users" value={count(users.length + 1, usersResult.ok)} />
        <StatCard label="Total Admins" value={count(users.filter((user) => user.role === 'admin').length + 1, usersResult.ok)} />
        <StatCard label="Statistic pending clarification" value="—" />
      </section>
      {!usersResult.ok && <p role="status" className="mt-4 text-slate-700">Local accounts are unavailable or damaged; counts cannot be determined.</p>}
      <section className="mt-12" aria-labelledby="recent-posts">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="recent-posts" className="font-serif text-3xl text-slate-900">Recent posts</h2>
          <Link to="/blogs" className="font-semibold text-indigo-700 underline">All blogs</Link>
        </div>
        {notice && <p role="status" className="mt-4 text-slate-700">{notice}</p>}
        {!postsResult.ok ? <p role="status" className="mt-5 text-slate-700">Local posts are unavailable or damaged. Stored data has not been changed.</p> : posts.length === 0 ? <p className="mt-5 text-slate-600">No posts yet.</p> : (
          <ul className="mt-5 border-b border-slate-200">
            {posts.slice(0, 5).map((post) => (
              <li key={post.id} className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 py-4">
                <div className="min-w-0 break-words">
                  <Link to={`/blog/${encodeURIComponent(post.id)}`} className="font-semibold text-slate-900 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">{post.title}</Link>
                  <p className="mt-1 text-sm text-slate-600">{typeof post.authorName === 'string' ? post.authorName : 'Unknown author'} · {formatPostDate(post.createdAt)}</p>
                </div>
                <div className="flex gap-3">
                  <Link to={`/edit/${encodeURIComponent(post.id)}`} aria-label={`Edit ${post.title}`} className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">Edit</Link>
                  <button type="button" aria-label={`Delete ${post.title}`} onClick={() => handleDelete(post)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

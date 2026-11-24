/** Display the signed-in browser-local reading list. */
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { BlogCard } from '../components/BlogCard';
import { newestPosts } from '../utils/posts';
import { readPosts } from '../utils/storage';

/** Render recent posts, an empty state, or a storage failure. */
export default function Home({ session }) {
  const result = readPosts();
  const posts = newestPosts(result.value);
  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-indigo-700">Signed in as {session.displayName}</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-slate-900 sm:text-5xl">Your reading space</h1>
          <p className="mt-3 text-slate-600">Discover stories saved in this browser.</p>
        </div>
        <Link
          to="/write"
          className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
        >
          Write a post
        </Link>
      </div>
      {!result.ok ? (
        <p role="status" className="mt-10 text-slate-700">Local posts are unavailable or damaged. Your stored data has not been changed.</p>
      ) : posts.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <h2 className="font-serif text-2xl text-slate-900">No posts yet</h2>
          <p className="mt-2 text-slate-600">Start the conversation by writing the first post.</p>
          <Link
            to="/write"
            className="mt-4 inline-block font-semibold text-indigo-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700"
          >
            Write a post
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => <BlogCard key={post.id} post={post} session={session} index={index} />)}
        </div>
      )}
    </main>
  );
}
Home.propTypes = { session: PropTypes.object.isRequired };

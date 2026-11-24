/** Present local discovery and the limitations of this demonstration. */
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { readPosts } from '../utils/storage';

const features = [
  ['01', 'Write Freely', 'A distraction-free space for plain-text writing.'],
  ['02', 'Private & Local', 'Your demo data stays in this browser profile, not a shared service.'],
  ['03', 'Instant & Fast', 'No server or connection to an account service is needed.'],
];

/** Render the landing page and up to three recent browser-local previews. */
export default function LandingPage({ session }) {
  const postsResult = readPosts();
  const posts = postsResult.value.filter((post) => post && typeof post.id === 'string' && typeof post.title === 'string' && typeof post.content === 'string')
    .slice().sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)).slice(0, 3);
  return (
    <main>
      <section className="bg-slate-50">
        <div
          className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:py-24"
        >
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">A little room to write</p>
            <h1
              className="max-w-2xl font-serif text-5xl leading-[1.1] tracking-tight text-slate-900 sm:text-6xl"
            >Your thoughts. Your space. <span className="text-indigo-700">Beautifully simple.</span></h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">WriteSpace is a simple place to put your ideas into words.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={session ? '/blogs' : '/login'}
                className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
              >Start Reading</Link>
              <Link
                to="/register"
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700"
              >Get Started Free</Link>
            </div>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-900 p-8 text-white shadow-xl motion-safe:animate-[float_6s_ease-in-out_infinite] sm:p-12">
            <p className="text-sm font-medium text-indigo-200">A space for your words</p>
            <p className="mt-8 font-serif text-3xl leading-snug sm:text-4xl">Every idea deserves a place to begin.</p>
            <div aria-hidden="true" className="mt-10 h-px w-16 bg-indigo-300"></div>
            <p className="mt-5 text-sm leading-6 text-indigo-100">Write simply. Read thoughtfully. Make it yours.</p>
          </div>
        </div>
      </section>
      <section aria-label="Demo limitations" className="border-y border-amber-200 bg-amber-50">
        <div className="mx-auto max-w-6xl px-5 py-5 text-sm leading-6 text-amber-950 sm:px-8">
          <strong>Local demo only.</strong> Accounts, passwords, and posts are stored unencrypted in this browser. Passwords are plain text; anyone with access to this browser can change the data. Do not use real passwords or sensitive content. There is no server, shared data, or cross-device sync.
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="font-serif text-4xl tracking-tight text-slate-900">A simpler way to share.</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {features.map(([number, title, description]) => (
            <article key={title} className="border-t-2 border-indigo-200 pt-5">
              <span className="text-sm font-semibold text-indigo-700">
                {number}
              </span>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-slate-100">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <h2 className="font-serif text-4xl tracking-tight text-slate-900">Latest from the Blog</h2>
          {!postsResult.ok ? (
            <p role="status" className="mt-6 text-slate-700">Local posts are unavailable or damaged. Your stored data has not been changed.</p>
          ) : posts.length === 0 ? (
            <p className="mt-6 text-slate-600">No posts yet — check back soon!</p>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {posts.map((post) => (
                <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-sm text-slate-500">
                    {Number.isNaN(Date.parse(post.createdAt)) ? 'Date unavailable' : new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-slate-900">
                    <Link
                      className="hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700"
                      to={`/blog/${encodeURIComponent(post.id)}`}
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-3 break-words leading-7 text-slate-600">
                    {post.content.slice(0, 120)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <footer className="bg-slate-900 text-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6 px-5 py-10 sm:px-8">
          <p>© {new Date().getFullYear()} WriteSpace</p>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-5 text-sm">
            <Link to="/">Home</Link>
            <Link to="/blogs">All Blogs</Link>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
LandingPage.propTypes = { session: PropTypes.object };

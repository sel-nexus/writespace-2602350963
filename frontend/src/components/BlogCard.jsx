/** Present a browser-local post preview and its permitted navigation. */
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import { canManagePost, formatPostDate, postExcerpt } from '../utils/posts';

const accents = ['border-t-indigo-400', 'border-t-violet-400', 'border-t-sky-400'];

/** Render a card without performing navigation on render. */
export function BlogCard({ post, session, index }) {
  const author = typeof post.authorName === 'string' && post.authorName.trim() ? post.authorName : 'Unknown author';
  return (
    <article
      className={`flex flex-col rounded-2xl border border-slate-200 border-t-4 ${accents[index % accents.length]} bg-white p-6`}
    >
      <time className="text-sm text-slate-600">
        {formatPostDate(post.createdAt)}
      </time>
      <h2 className="mt-3 font-serif text-2xl text-slate-900">
        <Link
          to={`/blog/${encodeURIComponent(post.id)}`}
          className="hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700"
        >
          {post.title}
        </Link>
      </h2>
      <p className="mt-3 flex-1 break-words leading-7 text-slate-600">
        {postExcerpt(post.content)}
      </p>
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar displayName={author} />
          <span className="break-words text-sm font-medium text-slate-700">
            {author}
          </span>
        </div>
        {canManagePost(session, post) && <Link
          to={`/edit/${encodeURIComponent(post.id)}`}
          aria-label={`Edit ${post.title}`}
          className="rounded-lg px-2 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700"
        >Edit</Link>}
      </div>
    </article>
  );
}
BlogCard.propTypes = { post: PropTypes.object.isRequired, session: PropTypes.object.isRequired, index: PropTypes.number.isRequired };

/** Render a full local post as plain text. */
import { Link, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { formatPostDate, newestPosts } from '../utils/posts';
import { readPosts } from '../utils/storage';

/** Show a post, a missing-record state, or a storage failure. */
export default function ReadBlog() {
  const { id } = useParams();
  const result = readPosts();
  const post = newestPosts(result.value).find((item) => item.id === id);
  const author = typeof post?.authorName === 'string' && post.authorName.trim() ? post.authorName : 'Unknown author';
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <Link to="/blogs" className="font-semibold text-indigo-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">Back to blogs</Link>
      {!result.ok ? (
        <p role="status" className="mt-8 text-slate-700">Local posts are unavailable or damaged. Your stored data has not been changed.</p>
      ) : !post ? (
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
        </article>
      )}
    </main>
  );
}

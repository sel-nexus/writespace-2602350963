/** Provide public navigation and explicit session actions. */
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { getRoleHome } from '../utils/auth';

/** Render account-aware public navigation. */
export function PublicNavbar({ session, onLogout }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Link to="/" className="font-serif text-2xl font-bold tracking-tight text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
          Write<span className="text-indigo-700">Space</span><span className="text-indigo-700">.</span>
        </Link>
        {session ? (
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <span className="flex items-center gap-2 text-slate-700">
              <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-800">{session.displayName.charAt(0).toUpperCase()}</span>
              {session.displayName}
            </span>
            <Link to={getRoleHome(session)} className="rounded-lg bg-indigo-700 px-3 py-2 text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">Go to Dashboard</Link>
            <button type="button" onClick={onLogout} className="rounded-lg px-2 py-2 text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">Logout</button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link to="/login" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">Login</Link>
            <Link to="/register" className="rounded-lg bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">Get Started</Link>
          </div>
        )}
      </nav>
    </header>
  );
}

PublicNavbar.propTypes = {
  session: PropTypes.shape({ displayName: PropTypes.string.isRequired, role: PropTypes.string.isRequired }),
  onLogout: PropTypes.func.isRequired,
};

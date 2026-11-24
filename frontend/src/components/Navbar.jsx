/** Provide responsive role-aware navigation for signed-in visitors. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, NavLink } from 'react-router-dom';
import { Avatar } from './Avatar';

/** Render navigation and invoke logout only on activation. */
export function Navbar({ session, onLogout }) {
  const [open, setOpen] = useState(false);
  const linkClass = ({ isActive }) => `rounded-lg px-3 py-2 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700 ${isActive ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700'}`;
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Link to="/" className="font-serif text-2xl font-bold tracking-tight text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
          Write<span className="text-indigo-700">Space.</span>
        </Link>
        <button type="button" aria-label="Toggle navigation menu" aria-expanded={open} aria-controls="authenticated-menu" onClick={() => setOpen(!open)} className="rounded-lg p-2 text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700 sm:hidden">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d={open ? 'M6 6l12 12M18 6L6 18' : 'M3 6h18M3 12h18M3 18h18'} /></svg>
        </button>
        <div id="authenticated-menu" className={`${open ? 'flex' : 'hidden'} w-full flex-col gap-2 text-sm font-medium sm:flex sm:w-auto sm:flex-row sm:items-center`}>
          <NavLink to="/blogs" onClick={() => setOpen(false)} className={linkClass}>Blogs</NavLink>
          <NavLink to="/write" onClick={() => setOpen(false)} className={linkClass}>Write</NavLink>
          {session.role === 'admin' && <NavLink to="/admin" onClick={() => setOpen(false)} className={linkClass}>Dashboard</NavLink>}
          {session.role === 'admin' && <NavLink to="/users" onClick={() => setOpen(false)} className={linkClass}>Users</NavLink>}
          <span className="flex items-center gap-2 px-3 py-2">
            <Avatar displayName={session.displayName} role={session.role} />
            <span>{session.displayName} <span className={`ml-1 rounded-full px-2 py-1 text-xs ${session.role === 'admin' ? 'bg-violet-100 text-violet-800' : 'bg-indigo-100 text-indigo-800'}`}>{session.role === 'admin' ? 'Admin' : 'Writer'}</span></span>
          </span>
          <button type="button" onClick={onLogout} className="rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">Logout</button>
        </div>
      </nav>
    </header>
  );
}
Navbar.propTypes = { session: PropTypes.object.isRequired, onLogout: PropTypes.func.isRequired };

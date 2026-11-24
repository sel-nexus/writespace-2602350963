/** Compose access routes and session-aware navigation. */
import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PublicNavbar } from './components/PublicNavbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { clearSession, getRoleHome, readSession } from './utils/auth';

/** Render access journeys without importing future feature pages. */
export default function App() {
  const [session, setSession] = useState(() => readSession().value);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (loggingOut && location.pathname === '/') setLoggingOut(false);
  }, [loggingOut, location.pathname]);

  /** Clear the session only when browser storage confirms removal. */
  function handleLogout() {
    const result = clearSession();
    if (!result.ok) {
      setError('Your session could not be cleared. Please check browser storage and try again.');
      return;
    }
    setLoggingOut(true);
    setSession(null);
    setError('');
  }

  /** Show a truthful holding view until later feature slices add these routes. */
  function accessDestination(adminOnly = false) {
    if (!session) return <Navigate to="/login" replace />;
    if (adminOnly && session.role !== 'admin') return <Navigate to="/blogs" replace />;
    return (
      <main className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <p className="text-sm font-semibold text-indigo-700">Signed in as {session.displayName}</p>
        <h1 className="mt-4 font-serif text-4xl text-slate-900">{adminOnly ? 'Admin dashboard' : 'Your reading space'}</h1>
        <p className="mt-4 text-slate-600">This area is not available in the access-only build.</p>
        <Link to="/" className="mt-6 inline-block font-semibold text-indigo-700 underline">Return home</Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <PublicNavbar session={session} onLogout={handleLogout} />
      {error && <p role="alert" className="bg-red-50 px-5 py-3 text-center text-sm text-red-800">{error}</p>}
      {loggingOut && location.pathname !== '/' ? <Navigate to="/" replace /> : <Routes>
        <Route path="/" element={<LandingPage session={session} />} />
        <Route path="/login" element={session ? <Navigate to={getRoleHome(session)} replace /> : <LoginPage onSession={setSession} />} />
        <Route path="/register" element={session ? <Navigate to={getRoleHome(session)} replace /> : <RegisterPage onSession={setSession} />} />
        <Route path="/blogs" element={accessDestination()} />
        <Route path="/blog/:id" element={accessDestination()} />
        <Route path="/write" element={accessDestination()} />
        <Route path="/edit/:id" element={accessDestination()} />
        <Route path="/admin" element={accessDestination(true)} />
        <Route path="/users" element={accessDestination(true)} />
        <Route path="*" element={<main className="mx-auto max-w-6xl px-5 py-20"><h1 className="text-3xl font-semibold">Page not found</h1><Link to="/" className="mt-4 inline-block text-indigo-700 underline">Return home</Link></main>} />
      </Routes>}
    </div>
  );
}

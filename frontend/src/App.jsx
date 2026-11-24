/** Compose access routes and session-aware navigation. */
import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PublicNavbar } from './components/PublicNavbar';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import Home from './pages/Home';
import ReadBlog from './pages/ReadBlog';
import WriteBlog from './pages/WriteBlog';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import { clearSession, getRoleHome, readSession } from './utils/auth';

/** Render access and reading journeys with future destinations held in place. */
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

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {session ? <Navbar session={session} onLogout={handleLogout} /> : <PublicNavbar session={session} onLogout={handleLogout} />}
      {error && <p role="alert" className="bg-red-50 px-5 py-3 text-center text-sm text-red-800">{error}</p>}
      {loggingOut && location.pathname !== '/' ? <Navigate to="/" replace /> : <Routes>
        <Route path="/" element={<LandingPage session={session} />} />
        <Route path="/login" element={session ? <Navigate to={getRoleHome(session)} replace /> : <LoginPage onSession={setSession} />} />
        <Route path="/register" element={session ? <Navigate to={getRoleHome(session)} replace /> : <RegisterPage onSession={setSession} />} />
        <Route element={<ProtectedRoute session={session} />}>
          <Route path="/blogs" element={session ? <Home session={session} /> : null} />
          <Route path="/blog/:id" element={<ReadBlog session={session} />} />
          <Route path="/write" element={<WriteBlog key="create" />} />
          <Route path="/edit/:id" element={<WriteBlog key={location.pathname} />} />
        </Route>
        <Route element={<ProtectedRoute session={session} allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/users" element={session ? <UserManagement session={session} /> : null} />
        </Route>
        <Route path="*" element={<main className="mx-auto max-w-6xl px-5 py-20"><h1 className="text-3xl font-semibold">Page not found</h1><Link to="/" className="mt-4 inline-block text-indigo-700 underline">Return home</Link></main>} />
      </Routes>}
    </div>
  );
}

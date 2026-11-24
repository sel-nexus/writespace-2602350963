/** Offer browser-local demo sign-in. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../utils/auth';

/** Render the sign-in form and report failed persistence. */
export default function LoginPage({ onSession }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  /** Validate and submit only on an explicit user action. */
  function handleSubmit(event) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    const result = login(username.trim(), password);
    if (!result.ok) {
      const messages = {
        invalid_credentials: 'Invalid username or password.',
        storage_read_failed: 'Local accounts could not be read. Sign-in was not completed.',
        session_write_failed: 'Your session could not be saved. Sign-in was not completed.',
      };
      setError(messages[result.error]);
      return;
    }
    onSession(result.session);
    navigate(result.navigateTo, { replace: true });
  }

  return (
    <main className="min-h-[calc(100dvh-70px)] bg-slate-50 px-5 py-12 sm:py-20">
      <div
        className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/60 sm:p-10"
      >
        <p className="text-sm font-semibold text-indigo-700">WriteSpace</p>
        <h1 className="mt-3 font-serif text-4xl text-slate-900">Welcome back.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Sign in to this browser-local demo. Do not use a real password.</p>
        <p className="mt-3 text-sm text-slate-600">Demo admin: <strong>admin</strong> / <strong>admin</strong></p>
        <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
          <div>
            <label htmlFor="login-username" className="block text-sm font-semibold text-slate-800">Username</label>
            <input
              id="login-username"
              autoComplete="username"
              required
              aria-required="true"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-semibold text-slate-800">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              aria-required="true"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-700 px-4 py-3 font-semibold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
          >Login</button>
        </form>
        <p className="mt-6 text-sm text-slate-600">New here? <Link to="/register" className="font-semibold text-indigo-700 underline">Register</Link></p>
      </div>
    </main>
  );
}
LoginPage.propTypes = { onSession: PropTypes.func.isRequired };

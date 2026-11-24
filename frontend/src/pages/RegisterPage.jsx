/** Offer self-registration for a local demo account. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../utils/auth';

const fields = [
  { key: 'displayName', label: 'Display Name', autoComplete: 'name' },
  { key: 'username', label: 'Username', autoComplete: 'username' },
  { key: 'password', label: 'Password', type: 'password', autoComplete: 'new-password' },
  { key: 'confirmPassword', label: 'Confirm Password', type: 'password', autoComplete: 'new-password' },
];

/** Render accessible registration fields and distinguish partial saves. */
export default function RegisterPage({ onSession }) {
  const [form, setForm] = useState({ displayName: '', username: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  /** Validate the form and navigate only after both writes succeed. */
  function handleSubmit(event) {
    event.preventDefault();
    const result = register(form);
    setErrors(result.errors || {});
    if (!result.ok) {
      const messages = {
        storage_read_failed: 'Local accounts could not be read. Your account was not saved.',
        account_write_failed: 'Your account could not be saved. Please check browser storage and try again.',
        session_write_failed_account_saved: 'Your account was saved, but the session could not be saved. Please use Login to try again.',
        id_unavailable: 'An account ID could not be generated. Your account was not saved.',
      };
      setMessage(messages[result.error] || 'Please correct the fields below.');
      return;
    }
    onSession(result.session);
    navigate(result.navigateTo, { replace: true });
  }

  return (
    <main className="min-h-[calc(100dvh-70px)] bg-slate-50 px-5 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/60 sm:p-10">
        <p className="text-sm font-semibold text-indigo-700">WriteSpace</p>
        <h1 className="mt-3 font-serif text-4xl text-slate-900">Make space to write.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">This is a local demo. Passwords are stored in plain text, so do not use a real password.</p>
        <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label htmlFor={`register-${field.key}`} className="block text-sm font-semibold text-slate-800">{field.label}</label>
              <input id={`register-${field.key}`} type={field.type || 'text'} autoComplete={field.autoComplete} required aria-required="true" aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `error-${field.key}` : undefined} value={form[field.key]} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600" />
              {errors[field.key] && <p id={`error-${field.key}`} role="alert" className="mt-1 text-sm text-red-700">{errors[field.key]}</p>}
            </div>
          ))}
          {message && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{message}</p>}
          <button type="submit" className="w-full rounded-lg bg-indigo-700 px-4 py-3 font-semibold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">Create account</button>
        </form>
        <p className="mt-6 text-sm text-slate-600">Already have an account? <Link to="/login" className="font-semibold text-indigo-700 underline">Login</Link></p>
      </div>
    </main>
  );
}
RegisterPage.propTypes = { onSession: PropTypes.func.isRequired };

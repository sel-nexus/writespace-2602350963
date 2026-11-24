/** Manage demo accounts stored in the current browser. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { UserRow } from '../components/UserRow';
import { createAdminManagedUser, deleteAdminManagedUser, readManagedUsers } from '../utils/auth';

const initialForm = { displayName: '', username: '', password: '', role: 'user' };
const defaultAdmin = { id: 'admin-fixed', displayName: 'Admin', username: 'admin', role: 'admin' };

/** Render local accounts and an explicitly submitted creation form. */
export default function UserManagement({ session }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState('');
  const [revision, setRevision] = useState(0);
  const result = readManagedUsers();

  /** Update a single form field without mutating stored accounts. */
  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  /** Persist only after validation and a fresh admin authorization check. */
  function submit(event) {
    event.preventDefault();
    setFeedback('');
    const created = createAdminManagedUser(form);
    if (!created.ok) {
      setErrors(created.errors || {});
      if (created.error !== 'validation') setFeedback('Account was not saved. Check your admin session and browser storage, then try again.');
      return;
    }
    setErrors({});
    setForm(initialForm);
    setFeedback('Account saved in this browser.');
    setRevision((value) => value + 1);
  }

  /** Confirm before removing one currently eligible account. */
  function remove(user) {
    if (!window.confirm(`Delete account “${user.username}”?`)) return;
    const deleted = deleteAdminManagedUser(user.id, true);
    if (!deleted.ok) {
      setFeedback('Account was not deleted. It may be protected, missing, or browser storage may be unavailable.');
      return;
    }
    setFeedback('Account deleted from this browser.');
    setRevision((value) => value + 1);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16" data-revision={revision}>
      <Link to="/admin" className="font-semibold text-indigo-700 underline">Back to dashboard</Link>
      <h1 className="mt-4 font-serif text-4xl text-slate-900">User management</h1>
      <p className="mt-3 max-w-3xl text-slate-700">Demo only: accounts and plaintext passwords are stored in this browser without encryption. Client-side roles are not security. Never use real passwords or sensitive content.</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.7fr)]">
        <section aria-labelledby="accounts-heading">
          <h2 id="accounts-heading" className="font-serif text-2xl text-slate-900">Local accounts</h2>
          {!result.ok && <p role="alert" className="mt-4 text-red-700">Local accounts are unavailable or damaged. Stored data has not been changed.</p>}
          <ul className="mt-5 border-b border-slate-200">
            <UserRow user={defaultAdmin} session={session} onDelete={remove} />
            {result.value.map((user) => <UserRow key={user.id} user={user} session={session} onDelete={remove} />)}
          </ul>
        </section>
        <section aria-labelledby="create-heading" className="rounded-xl border border-slate-200 p-6">
          <h2 id="create-heading" className="font-serif text-2xl text-slate-900">Create user</h2>
          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            {[
              { name: 'displayName', label: 'Display name', type: 'text' },
              { name: 'username', label: 'Username', type: 'text' },
              { name: 'password', label: 'Password', type: 'password' },
            ].map(({ name, label, type }) => (
              <div key={name}>
                <label htmlFor={`admin-${name}`} className="block text-sm font-semibold text-slate-800">{label}</label>
                <input id={`admin-${name}`} name={name} type={type} value={form[name]} onChange={change} aria-required="true" aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `admin-${name}-error` : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700" />
                {errors[name] && <p id={`admin-${name}-error`} role="alert" className="mt-1 text-sm text-red-700">{errors[name]}</p>}
              </div>
            ))}
            <div>
              <label htmlFor="admin-role" className="block text-sm font-semibold text-slate-800">Role</label>
              <select id="admin-role" name="role" value={form.role} onChange={change} aria-required="true" aria-invalid={Boolean(errors.role)} aria-describedby={errors.role ? 'admin-role-error' : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              {errors.role && <p id="admin-role-error" role="alert" className="mt-1 text-sm text-red-700">{errors.role}</p>}
            </div>
            <button type="submit" className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">Create user</button>
          </form>
          {feedback && <p role="status" className="mt-4 text-sm text-slate-700">{feedback}</p>}
        </section>
      </div>
    </main>
  );
}
UserManagement.propTypes = { session: PropTypes.object.isRequired };

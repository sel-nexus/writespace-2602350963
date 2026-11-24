/** Present one local account in a responsive row. */
import PropTypes from 'prop-types';
import { Avatar } from './Avatar';
import { formatPostDate } from '../utils/posts';

/** Render account details and a protected or actionable delete control. */
export function UserRow({ user, session, onDelete }) {
  const isDefault = user.id === 'admin-fixed' || user.username.toLowerCase() === 'admin';
  const isCurrent = user.id === session.userId;
  const reason = isDefault ? 'Default admin cannot be deleted.' : isCurrent ? 'Current account cannot be deleted.' : '';
  return (
    <li className="grid gap-3 border-t border-slate-200 py-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar displayName={user.displayName} role={user.role} />
        <div className="min-w-0 break-words">
          <p className="font-semibold text-slate-900">{user.displayName}</p>
          <p className="text-sm text-slate-600">@{user.username}</p>
        </div>
      </div>
      <span className="text-sm font-medium text-slate-700">{user.role === 'admin' ? 'Admin' : 'User'}</span>
      <span className="text-sm text-slate-600">{isDefault ? 'Built-in account' : formatPostDate(user.createdAt)}</span>
      <div>
        <button type="button" disabled={Boolean(reason)} title={reason || undefined} aria-label={`Delete ${user.username}`} onClick={() => onDelete(user)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-500">Delete</button>
        {reason && <p className="mt-1 text-xs text-slate-600">{reason}</p>}
      </div>
    </li>
  );
}
UserRow.propTypes = { user: PropTypes.object.isRequired, session: PropTypes.object.isRequired, onDelete: PropTypes.func.isRequired };

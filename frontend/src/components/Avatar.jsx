/** Present a local identity with a role-specific visual treatment. */
import PropTypes from 'prop-types';

/** Render an initial and a decorative role symbol. */
export function Avatar({ displayName, role = 'user' }) {
  const admin = role === 'admin';
  const name = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : 'Unknown author';
  return (
    <span aria-label={`${name} avatar`} className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold ${admin ? 'bg-violet-100 text-violet-800' : 'bg-indigo-100 text-indigo-800'}`}>
      {name.charAt(0).toUpperCase()}
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white p-0.5">
        {admin ? <path d="M3 7l4 3 5-6 5 6 4-3-2 11H5L3 7z" /> : <path d="M4 5c3-1 6 0 8 2 2-2 5-3 8-2v13c-3-1-6 0-8 2-2-2-5-3-8-2V5zm8 2v13" />}
      </svg>
    </span>
  );
}
Avatar.propTypes = { displayName: PropTypes.string, role: PropTypes.oneOf(['admin', 'user']) };

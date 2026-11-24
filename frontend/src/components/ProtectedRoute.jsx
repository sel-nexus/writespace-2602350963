/** Gate client-side navigation using the current local session. */
import PropTypes from 'prop-types';
import { Navigate, Outlet } from 'react-router-dom';

/** Render protected content or the appropriate role redirect. */
export function ProtectedRoute({ session, allowedRoles }) {
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(session.role)) return <Navigate to="/blogs" replace />;
  return <Outlet />;
}

ProtectedRoute.propTypes = {
  session: PropTypes.object,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
};

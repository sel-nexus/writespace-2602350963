/** Present one browser-local dashboard statistic. */
import PropTypes from 'prop-types';

/** Render a label and its available value. */
export function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
StatCard.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired };

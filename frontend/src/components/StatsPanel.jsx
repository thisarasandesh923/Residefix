import { useEffect, useState } from "react";
import { complaintsApi } from "../services/api";
import { capitalize } from "../constants/complaints";

const formatDuration = (hours) => {
  if (hours === null || hours === undefined) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${hours} h`;
  return `${Math.round((hours / 24) * 10) / 10} days`;
};

const shortDay = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

// Manager analytics: resolution time, most common issue types, load per property
// and the number of new complaints per day. Re-fetches whenever `version` changes.
export default function StatsPanel({ version, onError }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    complaintsApi
      .stats()
      .then((data) => !cancelled && setStats(data))
      .catch((err) => !cancelled && onError?.(err));
    return () => {
      cancelled = true;
    };
  }, [version, onError]);

  if (!stats) return null;
  if (stats.total === 0) return null;

  const categories = Object.entries(stats.byCategory);
  const topCategory = categories[0];
  const maxProperty = Math.max(1, ...stats.byProperty.map((p) => p.total));
  const maxDay = Math.max(1, ...stats.trend.map((d) => d.count));
  const lastTwoWeeks = stats.trend.reduce((sum, d) => sum + d.count, 0);

  return (
    <section className="analytics" aria-label="Complaint analytics">
      <div className="analytics-kpis">
        <div className="kpi">
          <span className="kpi-label">Average resolution time</span>
          <span className="kpi-value">{formatDuration(stats.averageResolutionHours)}</span>
          <span className="kpi-hint">{stats.resolvedCount} resolved so far</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Most common issue</span>
          <span className="kpi-value">{topCategory ? capitalize(topCategory[0]) : "—"}</span>
          <span className="kpi-hint">
            {topCategory ? `${topCategory[1]} of ${stats.total} complaints` : "No data yet"}
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">High priority still open</span>
          <span className="kpi-value">{stats.openHighPriority ?? "—"}</span>
          <span className="kpi-hint">{stats.byPriority.high || 0} high priority in total</span>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Complaints per property</h3>
          <ul className="bar-list">
            {stats.byProperty.map((p) => (
              <li key={p.property}>
                <div className="bar-row">
                  <span className="bar-name" title={p.property}>{p.property}</span>
                  <span className="bar-count">
                    {p.total} <span className="muted">({p.open} unresolved)</span>
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(p.total / maxProperty) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="analytics-card">
          <h3>New complaints, last 14 days</h3>
          <div className="trend" role="img" aria-label={`${lastTwoWeeks} complaints in the last 14 days`}>
            {stats.trend.map((d) => (
              <div key={d.date} className="trend-col" title={`${shortDay(d.date)}: ${d.count}`}>
                <div className="trend-bar" style={{ height: `${(d.count / maxDay) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="trend-axis">
            <span>{shortDay(stats.trend[0].date)}</span>
            <span>{lastTwoWeeks} total</span>
            <span>{shortDay(stats.trend[stats.trend.length - 1].date)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

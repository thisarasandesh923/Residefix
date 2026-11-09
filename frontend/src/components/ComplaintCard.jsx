import { STATUSES, STATUS_LABELS } from "../constants/complaints";

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function ComplaintCard({ complaint, isManager, busy, onEdit, onDelete, onStatusChange }) {
  const c = complaint;
  const canEdit = !isManager && c.status === "open";

  return (
    <li className="complaint-item">
      <div className="complaint-head">
        <div className="complaint-title">{c.title}</div>
        <span className={`badge status-${c.status}`}>{STATUS_LABELS[c.status]}</span>
      </div>

      <div className="complaint-meta">
        <span className={`badge priority-${c.priority}`}>{c.priority} priority</span>
        <span className="badge category">{c.category}</span>
        <span className="property">{c.property}</span>
      </div>

      <p className="complaint-desc">{c.description}</p>

      <div className="complaint-foot">
        <span className="complaint-date">
          {isManager && c.createdBy?.name ? `${c.createdBy.name} · ` : ""}
          Reported {formatDate(c.createdAt)}
          {c.status === "resolved" && c.resolvedAt ? ` · Resolved ${formatDate(c.resolvedAt)}` : ""}
        </span>

        <div className="complaint-actions">
          {isManager && (
            <>
              <label className="sr-only" htmlFor={`status-${c._id}`}>
                Status
              </label>
              <select
                id={`status-${c._id}`}
                className="status-select"
                value={c.status}
                disabled={busy}
                onChange={(e) => onStatusChange(c, e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button className="btn-link danger" disabled={busy} onClick={() => onDelete(c)}>
                Delete
              </button>
            </>
          )}
          {canEdit && (
            <>
              <button className="btn-link" disabled={busy} onClick={() => onEdit(c)}>
                Edit
              </button>
              <button className="btn-link danger" disabled={busy} onClick={() => onDelete(c)}>
                Withdraw
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

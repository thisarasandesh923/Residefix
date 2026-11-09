import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiRequest,
  clearSession,
  getSession,
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  STATUS_LABELS,
} from "./api";
import ComplaintCard from "./ComplaintCard";
import ComplaintForm from "./ComplaintForm";
import "./Dashboard.css";

const NO_FILTERS = { q: "", status: "", category: "", priority: "" };

export default function Dashboard() {
  const navigate = useNavigate();
  const [session] = useState(getSession);
  const user = session?.user;
  const isManager = user?.role === "manager";

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState(NO_FILTERS);
  const [formTarget, setFormTarget] = useState(null); // null = closed, "new" or a complaint
  const [busyId, setBusyId] = useState(null);

  const logout = useCallback(() => {
    clearSession();
    navigate("/login");
  }, [navigate]);

  // Any 401 means the token is missing or expired: send the user back to log in.
  const handleError = useCallback(
    (err) => {
      if (err.status === 401) return logout();
      setError(err.message);
    },
    [logout]
  );

  useEffect(() => {
    if (!session) {
      navigate("/login");
      return;
    }
    apiRequest("/complaints")
      .then(setComplaints)
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [session, navigate, handleError]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const counts = useMemo(() => {
    const result = { total: complaints.length, open: 0, "in-progress": 0, resolved: 0 };
    complaints.forEach((c) => (result[c.status] += 1));
    return result;
  }, [complaints]);

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return complaints.filter(
      (c) =>
        (!filters.status || c.status === filters.status) &&
        (!filters.category || c.category === filters.category) &&
        (!filters.priority || c.priority === filters.priority) &&
        (!q ||
          [c.title, c.description, c.property, c.createdBy?.name]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(q)))
    );
  }, [complaints, filters]);

  const hasFilters = Object.values(filters).some(Boolean);
  const setFilter = (name, value) => setFilters((f) => ({ ...f, [name]: value }));

  const replaceComplaint = (updated) =>
    setComplaints((list) => list.map((c) => (c._id === updated._id ? updated : c)));

  const handleSave = async (data) => {
    try {
      if (formTarget === "new") {
        const created = await apiRequest("/complaints", { method: "POST", body: data });
        setComplaints((list) => [created, ...list]);
        setNotice("Complaint submitted.");
      } else {
        const updated = await apiRequest(`/complaints/${formTarget._id}`, {
          method: "PATCH",
          body: data,
        });
        replaceComplaint(updated);
        setNotice("Complaint updated.");
      }
      setFormTarget(null);
    } catch (err) {
      if (err.status === 401) return logout();
      throw err; // shown inside the form
    }
  };

  const handleStatusChange = async (complaint, status) => {
    setBusyId(complaint._id);
    setError("");
    try {
      const updated = await apiRequest(`/complaints/${complaint._id}`, {
        method: "PATCH",
        body: { status },
      });
      replaceComplaint(updated);
      setNotice(`Marked "${complaint.title}" as ${STATUS_LABELS[status].toLowerCase()}.`);
    } catch (err) {
      handleError(err);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (complaint) => {
    const verb = isManager ? "Delete" : "Withdraw";
    if (!window.confirm(`${verb} "${complaint.title}"? This cannot be undone.`)) return;
    setBusyId(complaint._id);
    setError("");
    try {
      await apiRequest(`/complaints/${complaint._id}`, { method: "DELETE" });
      setComplaints((list) => list.filter((c) => c._id !== complaint._id));
      setNotice(isManager ? "Complaint deleted." : "Complaint withdrawn.");
    } catch (err) {
      handleError(err);
    } finally {
      setBusyId(null);
    }
  };

  if (!user) return null;

  const statCards = [
    { key: "", label: "Total", value: counts.total },
    ...STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s], value: counts[s] })),
  ];

  return (
    <div className="dashboard-page">
      <header className="dashboard-nav">
        <div className="logo">ResideFix</div>
        <div className="nav-right">
          <span className="user-chip">
            {user.name}
            <span className="role">{isManager ? "Manager" : "Resident"}</span>
          </span>
          <button onClick={logout} className="logout-btn">
            Log Out
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="page-head">
          <div>
            <h2>{isManager ? "All complaints" : "My complaints"}</h2>
            <p className="page-sub">
              {isManager
                ? "Review reported issues and keep their status up to date."
                : "Report maintenance issues and follow them until they are fixed."}
            </p>
          </div>
          {!isManager && (
            <button className="btn-primary" onClick={() => setFormTarget("new")}>
              + New complaint
            </button>
          )}
        </div>

        <div className="stats">
          {statCards.map((s) => (
            <button
              key={s.label}
              className={`stat-card ${filters.status === s.key ? "active" : ""}`}
              onClick={() => setFilter("status", s.key)}
              aria-pressed={filters.status === s.key}
            >
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="filters">
          <input
            type="search"
            placeholder={isManager ? "Search title, property or resident" : "Search your complaints"}
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            aria-label="Search complaints"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilter("category", e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilter("priority", e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button className="btn-link" onClick={() => setFilters(NO_FILTERS)}>
              Clear
            </button>
          )}
        </div>

        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {error && <p className="error">{error}</p>}

        {loading ? (
          <p className="empty-state">Loading complaints...</p>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            {complaints.length === 0 ? (
              isManager ? (
                <p>No complaints have been reported yet.</p>
              ) : (
                <>
                  <p>You have not reported any issues yet.</p>
                  <button className="btn-primary" onClick={() => setFormTarget("new")}>
                    Report your first issue
                  </button>
                </>
              )
            ) : (
              <p>No complaints match these filters.</p>
            )}
          </div>
        ) : (
          <ul className="complaint-list">
            {visible.map((c) => (
              <ComplaintCard
                key={c._id}
                complaint={c}
                isManager={isManager}
                busy={busyId === c._id}
                onEdit={setFormTarget}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </ul>
        )}
      </main>

      {formTarget && (
        <ComplaintForm
          initial={formTarget === "new" ? null : formTarget}
          defaultProperty={user.property || ""}
          onSubmit={handleSave}
          onCancel={() => setFormTarget(null)}
        />
      )}
    </div>
  );
}

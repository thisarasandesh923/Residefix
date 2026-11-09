import { useEffect, useRef, useState } from "react";
import { CATEGORIES, PRIORITIES } from "./api";

const EMPTY = {
  title: "",
  description: "",
  category: "other",
  priority: "medium",
  property: "",
};

// Modal form used to create a new complaint or edit an existing one.
export default function ComplaintForm({ initial, defaultProperty = "", onSubmit, onCancel }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(() =>
    initial
      ? {
          title: initial.title,
          description: initial.description,
          category: initial.category,
          priority: initial.priority,
          property: initial.property,
        }
      : { ...EMPTY, property: defaultProperty }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.title.trim().length < 3) return setError("Title must be at least 3 characters.");
    if (form.description.trim().length < 10)
      return setError("Please describe the issue in at least 10 characters.");
    if (!form.property.trim()) return setError("Please enter the property or room.");

    setError("");
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        property: form.property.trim(),
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        className="modal"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="complaint-form-title"
      >
        <h3 id="complaint-form-title">{isEdit ? "Edit complaint" : "Report a new issue"}</h3>

        <label htmlFor="title">Title</label>
        <input
          ref={titleRef}
          id="title"
          name="title"
          maxLength={120}
          placeholder="e.g. Bathroom tap is leaking"
          value={form.title}
          onChange={handleChange}
          required
        />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          placeholder="What is wrong, where exactly, and since when?"
          value={form.description}
          onChange={handleChange}
          required
        />

        <div className="form-row">
          <div>
            <label htmlFor="category">Category</label>
            <select id="category" name="category" value={form.category} onChange={handleChange}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority">Priority</label>
            <select id="priority" name="priority" value={form.priority} onChange={handleChange}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="property">Property / room</label>
        <input
          id="property"
          name="property"
          maxLength={120}
          placeholder="e.g. Green Hostel, Room 12"
          value={form.property}
          onChange={handleChange}
          required
        />

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Submit complaint"}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "./api";
import "./Login.css";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "resident",
    property: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          property: form.role === "resident" ? form.property : "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Signup failed. Please try again.");
        return;
      }

      // Signup succeeded — send them to log in
      navigate("/login");
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>ResideFix</h1>
        <p className="subtitle">Create your account</p>

        <label htmlFor="name">Full Name</label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Your full name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label htmlFor="role">I am a</label>
        <select id="role" name="role" value={form.role} onChange={handleChange}>
          <option value="resident">Resident</option>
          <option value="manager">Property Manager / Landlord</option>
        </select>

        {form.role === "resident" && (
          <>
            <label htmlFor="property">Property / room (optional)</label>
            <input
              id="property"
              name="property"
              type="text"
              placeholder="e.g. Green Hostel, Room 12"
              value={form.property}
              onChange={handleChange}
            />
          </>
        )}

        <label htmlFor="password">Password</label>
        <div className="pw-row">
          <input
            id="password"
            name="password"
            type={showPw ? "text" : "password"}
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button type="button" onClick={() => setShowPw(!showPw)}>
            {showPw ? "Hide" : "Show"}
          </button>
        </div>

        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showPw ? "text" : "password"}
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>
        <p className="footer-text">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </form>
    </div>
  );
}

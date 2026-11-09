import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { saveSession } from "../services/session";
import "../styles/Login.css";

export default function Login() {
  const location = useLocation();
  const justRegistered = Boolean(location.state?.registered);
  const [form, setForm] = useState({ email: location.state?.email || "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!form.password) {
      setError("Please enter your password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await authApi.login(form);
      // Save token + user info so the app knows we're logged in
      saveSession(data);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <h1><Link to="/" className="brand-link">ResideFix</Link></h1>
        <p className="subtitle">Sign in to manage your complaints</p>
        {justRegistered && !error && (
          <p className="success" role="status">Account created. You can log in now.</p>
        )}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        <label htmlFor="password">Password</label>
        <div className="pw-row">
          <input
            id="password"
            name="password"
            type={showPw ? "text" : "password"}
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
          <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"}>
            {showPw ? "Hide" : "Show"}
          </button>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </button>
        <p className="footer-text">
          No account? <Link to="/signup">Register</Link>
        </p>
      </form>
    </div>
  );
}

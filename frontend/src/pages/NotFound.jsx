import { Link } from "react-router-dom";
import "../styles/Login.css";

export default function NotFound() {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Page not found</h1>
        <p className="subtitle">The page you are looking for does not exist.</p>
        <Link to="/" className="submit-btn link-btn">
          Back to home
        </Link>
      </div>
    </div>
  );
}

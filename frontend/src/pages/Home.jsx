import { Link } from "react-router-dom";
import "../styles/Home.css";

export default function Home() {
  return (
    <div className="home-page">
      <header className="home-nav">
        <div className="logo">ResideFix</div>
        <div className="nav-links">
          <Link to="/login">Log In</Link>
          <Link to="/signup" className="nav-cta">Sign Up</Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-text">
          <h1>Complaint tracking for every home &#8212; hostels, apartments, and boarding houses</h1>
          <p>
            ResideFix lets residents report maintenance issues in seconds, and
            gives managers and landlords one dashboard to track, assign, and
            resolve every complaint across their properties.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn-primary">Get Started</Link>
            <Link to="/login" className="btn-secondary">I already have an account</Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <h3>Report Issues Fast</h3>
          <p>Log electrical, plumbing, internet, or security issues with a category and priority tag.</p>
        </div>
        <div className="feature-card">
          <h3>Track in Real Time</h3>
          <p>See exactly where each complaint stands, from submitted to resolved.</p>
        </div>
        <div className="feature-card">
          <h3>Manage Many Properties</h3>
          <p>Built for landlords and wardens handling more than one hostel, apartment, or boarding house.</p>
        </div>
      </section>

      <footer className="home-footer">
        <p>&copy; 2026 ResideFix &#8212; Devops Engineering Module Project</p>
      </footer>
    </div>
  );
}

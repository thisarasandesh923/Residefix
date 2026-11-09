import { Navigate } from "react-router-dom";
import { getSession } from "../services/session";

// Renders its children only for a logged-in user; otherwise redirects to /login.
export default function ProtectedRoute({ children }) {
  return getSession() ? children : <Navigate to="/login" replace />;
}

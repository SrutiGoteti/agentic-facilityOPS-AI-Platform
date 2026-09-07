import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../App.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B1220" }}>
      <div className="panel" style={{ width: 380, padding: 32 }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Create Account</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>Agentic FacilityOps AI Platform</p>

        <form onSubmit={handleSubmit}>
          <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
            style={{ width: "100%", background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "10px 12px", color: "#E8ECF4", marginBottom: 16, boxSizing: "border-box" }} />

          <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            style={{ width: "100%", background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "10px 12px", color: "#E8ECF4", marginBottom: 16, boxSizing: "border-box" }} />

          <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Password</label>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              style={{ width: "100%", background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "10px 40px 10px 12px", color: "#E8ECF4", boxSizing: "border-box" }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ width: "100%", background: "var(--cyan)", border: "none", borderRadius: 6, padding: "10px 0", fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
          Already have an account? <Link to="/login" style={{ color: "var(--cyan)" }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import EnergyDashboard from "./pages/energy";
import MaintenanceDashboard from "./pages/maintenance";
import OccupancyDashboard from "./pages/occupancy";
import SecurityDashboard from "./pages/security";
import CostDashboard from "./pages/cost";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import "./App.css";

function Nav() {
  const { user, logout } = useAuth();
  return (
    <nav style={{ display: "flex", gap: 20, padding: "16px 24px", borderBottom: "1px solid #1F2A44", alignItems: "center" }}>
      <Link to="/" style={{ color: "#E8ECF4", textDecoration: "none" }}>Energy</Link>
      <Link to="/maintenance" style={{ color: "#E8ECF4", textDecoration: "none" }}>Maintenance</Link>
      <Link to="/occupancy" style={{ color: "#E8ECF4", textDecoration: "none" }}>Occupancy</Link>
      <Link to="/security" style={{ color: "#E8ECF4", textDecoration: "none" }}>Security</Link>
      <Link to="/cost" style={{ color: "#E8ECF4", textDecoration: "none" }}>Cost</Link>
      <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
        {user && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{user.username}</span>}
        {user && (
          <button onClick={logout}
            style={{ background: "none", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      {user && <Nav />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedRoute><EnergyDashboard /></ProtectedRoute>} />
        <Route path="/maintenance" element={<ProtectedRoute><MaintenanceDashboard /></ProtectedRoute>} />
        <Route path="/occupancy" element={<ProtectedRoute><OccupancyDashboard /></ProtectedRoute>} />
        <Route path="/security" element={<ProtectedRoute><SecurityDashboard /></ProtectedRoute>} />
        <Route path="/cost" element={<ProtectedRoute><CostDashboard /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
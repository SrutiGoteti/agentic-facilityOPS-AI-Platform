import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import EnergyDashboard from "./pages/energy";
import MaintenanceDashboard from "./pages/maintenance";
import OccupancyDashboard from "./pages/occupancy";
import SecurityDashboard from "./pages/security";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: "flex", gap: 20, padding: "16px 24px", borderBottom: "1px solid #1F2A44" }}>
        <Link to="/" style={{ color: "#E8ECF4", textDecoration: "none" }}>Energy</Link>
        <Link to="/maintenance" style={{ color: "#E8ECF4", textDecoration: "none" }}>Maintenance</Link>
        <Link to="/occupancy" style={{ color: "#E8ECF4", textDecoration: "none" }}>Occupancy</Link>
        <Link to="/security" style={{ color: "#E8ECF4", textDecoration: "none" }}>Security</Link>
      </nav>
      <Routes>
        <Route path="/" element={<EnergyDashboard />} />
        <Route path="/maintenance" element={<MaintenanceDashboard />} />
        <Route path="/occupancy" element={<OccupancyDashboard />} />
        <Route path="/security" element={<SecurityDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
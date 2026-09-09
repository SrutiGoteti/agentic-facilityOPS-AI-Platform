import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getSecurityDashboard, addSecurityEvent, deleteSecurityEvent } from "../../services/api";
import "../../App.css";

const LOCATIONS = ["Main Entrance", "Server Room", "Rear Exit", "Parking Lot", "Loading Dock"];
const EVENT_TYPES = ["Forced Entry", "Unauthorized Access", "Alarm Triggered", "After-Hours Motion", "Camera Offline", "Door Left Open", "Failed Badge Scan"];

function severityBadgeClass(sev) {
  if (sev === "high") return "spike";
  if (sev === "medium") return "drop";
  return "drop";
}

export default function SecurityDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [byType, setByType] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [afterHours, setAfterHours] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [recentEvents, setRecentEvents] = useState([]);
  const [addStatus, setAddStatus] = useState("");
  const [newEvent, setNewEvent] = useState({ timestamp: "", location: LOCATIONS[0], event_type: EVENT_TYPES[0], severity: "medium", resolved: false });
  const [eventsByLocation, setEventsByLocation] = useState(null);

const refreshAllData = async () => {
  const data = await getSecurityDashboard();
  setAnalytics(data.analytics);
  setByType(data.events_by_type);
  setTimeline(data.timeline);
  setAfterHours(data.after_hours);
  setRecommendations(data.recommendations);
  setRecentEvents(data.recent_events);
  setEventsByLocation(data.events_by_location);
};

  useEffect(() => { refreshAllData(); }, []);

  const handleAddEvent = async () => {
    setAddStatus("Adding...");
    try {
      await addSecurityEvent(newEvent);
      setAddStatus("Added — refreshing dashboard...");
      refreshAllData();
      setTimeout(() => setAddStatus(""), 2000);
    } catch (err) {
      console.error(err);
      setAddStatus("Failed to add — check console");
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteSecurityEvent(eventId);
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!analytics || !byType) return <p style={{ padding: 40, color: "#8792A6" }}>Loading security data...</p>;

  const timelineData = timeline ? Object.entries(timeline).map(([hour, count]) => ({ hour: `${hour}:00`, count })) : [];
  const filteredEvents = afterHours
    ? afterHours.events.filter(e =>
        e.location.toLowerCase().includes(search.toLowerCase()) &&
        (severityFilter === "all" || e.severity === severityFilter)
      )
    : [];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Security Monitoring — Facility 01</h1>
        <span className="status-tag">● Live</span>
      </div>

      {/* Row 1 */}
      <div className="dash-grid cols-3">
        <div className="panel">
          <p className="panel-title">Overview</p>
          <div className="stat-inline-row">
            <div className="stat-inline-item">
              <span className="stat-inline-label">Total Events</span>
              <span className="stat-inline-value mono" style={{ color: "var(--cyan)" }}>{analytics.total_events}</span>
            </div>
            <div className="stat-inline-item">
              <span className="stat-inline-label">After-Hours</span>
              <span className="stat-inline-value mono" style={{ color: "var(--amber)" }}>{analytics.after_hours_count}</span>
            </div>
          </div>
        </div>
        <div className="panel">
          <p className="panel-title">Severity Breakdown</p>
          <div className="stat-inline-row">
            <div className="stat-inline-item">
              <span className="stat-inline-label">High</span>
              <span className="stat-inline-value mono" style={{ color: "var(--danger)" }}>{analytics.severity_breakdown.high || 0}</span>
            </div>
            <div className="stat-inline-item">
              <span className="stat-inline-label">Medium</span>
              <span className="stat-inline-value mono" style={{ color: "var(--amber)" }}>{analytics.severity_breakdown.medium || 0}</span>
            </div>
            <div className="stat-inline-item">
              <span className="stat-inline-label">Low</span>
              <span className="stat-inline-value mono" style={{ color: "var(--cyan)" }}>{analytics.severity_breakdown.low || 0}</span>
            </div>
          </div>
        </div>
        <div className="panel">
          <p className="panel-title">Attention Needed</p>
          <div className="stat-inline-row">
            <div className="stat-inline-item">
              <span className="stat-inline-label">Unresolved</span>
              <span className="stat-inline-value mono" style={{ color: "var(--danger)" }}>{analytics.unresolved_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Remove Real Data */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <p className="panel-title">Add / Remove Real Data</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Timestamp</label>
            <input type="datetime-local" value={newEvent.timestamp} onChange={(e) => setNewEvent({ ...newEvent, timestamp: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4" }} />
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Location</label>
            <select value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4" }}>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Event Type</label>
            <select value={newEvent.event_type} onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4" }}>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Severity</label>
            <select value={newEvent.severity} onChange={(e) => setNewEvent({ ...newEvent, severity: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4" }}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </div>
          <button onClick={handleAddEvent} disabled={!newEvent.timestamp}
            style={{ background: "var(--cyan)", border: "none", borderRadius: 6, padding: "9px 20px", fontWeight: 600, cursor: "pointer" }}>
            Add Event
          </button>
          {addStatus && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{addStatus}</span>}
        </div>

        <p className="panel-title">Recent Events (click to delete)</p>
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          <table className="data-table">
            <thead><tr><th>Location</th><th>Type</th><th>Severity</th><th>Timestamp</th><th></th></tr></thead>
            <tbody>
              {recentEvents.map((e) => (
                <tr key={e.event_id}>
                  <td>{e.location}</td>
                  <td>{e.event_type}</td>
                  <td><span className={`badge ${severityBadgeClass(e.severity)}`}>{e.severity}</span></td>
                  <td className="mono" style={{ color: "var(--text-muted)" }}>{e.timestamp}</td>
                  <td>
                    <button onClick={() => handleDeleteEvent(e.event_id)}
                      style={{ background: "none", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 12 }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Events by type + timeline + location */}
      <div className="dash-grid cols-3">
        <div className="panel">
          <p className="panel-title">Events by Type</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byType} layout="vertical">
              <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="event_type" stroke="#8792A6" fontSize={11} tickLine={false} axisLine={false} width={130} />
              <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} />
              <Bar dataKey="count" fill="#F2545B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <p className="panel-title">Events by Hour of Day</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timelineData}>
              <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" stroke="#8792A6" fontSize={10} tickLine={false} axisLine={false} interval={2} />
              <YAxis stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} />
              <Line type="monotone" dataKey="count" stroke="#F5B942" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <p className="panel-title">Events by Location</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={eventsByLocation || []}>
              <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="location" stroke="#8792A6" fontSize={10} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={50} />
              <YAxis stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} />
              <Bar dataKey="count" fill="#F5B942" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* After-hours events table */}
      {afterHours && (
        <div className="panel">
          <p className="panel-title">
            After-Hours Events
            <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{afterHours.total_after_hours} total</span>
          </p>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <input type="text" placeholder="Search by location..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "7px 10px", color: "#E8ECF4", flex: 1, fontSize: 13 }} />
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "7px 10px", color: "#E8ECF4", fontSize: 13 }}>
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            <table className="data-table">
              <thead><tr><th>Location</th><th>Type</th><th>Severity</th><th>Timestamp</th></tr></thead>
              <tbody>
                {filteredEvents.map((e, i) => (
                  <tr key={i}>
                    <td>{e.location}</td>
                    <td>{e.event_type}</td>
                    <td><span className={`badge ${severityBadgeClass(e.severity)}`}>{e.severity}</span></td>
                    <td className="mono" style={{ color: "var(--text-muted)" }}>{e.timestamp}</td>
                  </tr>
                ))}
                {filteredEvents.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "16px 0" }}>No matching events</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="panel">
        <p className="panel-title">Security Recommendations</p>
        <ul className="rec-list">
          {recommendations.map((rec, i) => <li key={i} className="rec-item">{rec}</li>)}
        </ul>
      </div>
    </div>
  );
}
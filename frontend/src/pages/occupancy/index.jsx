import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getOccupancyAnalytics, getOccupancyHeatmap, getRoomComparison, getOvercrowdingEvents, getOccupancyDayOfWeek, getOccupancyRecommendations, addOccupancyRecord, deleteOccupancyRecord, getRecentOccupancyRecords, getOccupancyRoomList } from "../../services/api";
import { getCachedData, setCachedData, clearCachedData } from "../../utils/dashboardCache";
import "../../App.css";

function getHeatColor(peakPct) {
  if (peakPct >= 100) return { bg: "#4A1420", border: "#F2545B", label: "Very High Occupancy", labelColor: "#F2545B" };
  if (peakPct >= 70) return { bg: "#4A2E0A", border: "#F5B942", label: "High Occupancy", labelColor: "#F5B942" };
  if (peakPct >= 40) return { bg: "#0E3A45", border: "#34D3C9", label: "Moderate Occupancy", labelColor: "#34D3C9" };
  return { bg: "#16283A", border: "#5B9BD5", label: "Low Occupancy", labelColor: "#5B9BD5" };
}

function SemiGauge({ percent, value, subLabel, color }) {
  const r = 80;
  const path = `M 20 100 A ${r} ${r} 0 0 1 180 100`;
  const length = Math.PI * r;
  const offset = length * (1 - Math.min(percent, 100) / 100);
  return (
    <svg width="200" height="120" viewBox="0 0 200 120">
      <path d={path} fill="none" stroke="#1F2A44" strokeWidth="14" strokeLinecap="round" />
      <path d={path} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={length} strokeDashoffset={offset} />
      <text x="100" y="90" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="26" fontWeight="700" fill="#E8ECF4">{value}</text>
      <text x="100" y="110" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#8792A6">{subLabel}</text>
    </svg>
  );
}

export default function OccupancyDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [roomComparison, setRoomComparison] = useState(null);
  const [overcrowding, setOvercrowding] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [search, setSearch] = useState("");
  const [recentRecords, setRecentRecords] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);
  const [addStatus, setAddStatus] = useState("");
  const [newRecord, setNewRecord] = useState({ room_id: "", timestamp: "", headcount: "" });

  const applyData = (d) => {
    setAnalytics(d.analytics);
    setHeatmap(d.heatmap);
    setRoomComparison(d.roomComparison);
    setOvercrowding(d.overcrowding);
    setDayData(d.dayData);
    setRecommendations(d.recommendations);
    setRecentRecords(d.recentRecords);
    setRoomOptions(d.roomOptions);
  };

  const refreshAllData = () => {
    Promise.all([
      getOccupancyAnalytics(),
      getOccupancyHeatmap(),
      getRoomComparison(),
      getOvercrowdingEvents(),
      getOccupancyDayOfWeek(),
      getOccupancyRecommendations(),
      getRecentOccupancyRecords(),
      getOccupancyRoomList(),
    ]).then(([analytics, heatmap, roomComparison, overcrowding, dayData, recommendations, recentRecords, roomOptions]) => {
      const bundle = { analytics, heatmap, roomComparison, overcrowding, dayData, recommendations, recentRecords, roomOptions };
      applyData(bundle);
      setCachedData("occupancy", bundle);
    });
  };

  useEffect(() => {
    const cached = getCachedData("occupancy");
    if (cached) {
      applyData(cached);
    } else {
      refreshAllData();
    }
  }, []);

  const handleAddRecord = async () => {
    setAddStatus("Adding...");
    try {
      await addOccupancyRecord({ ...newRecord, room_id: Number(newRecord.room_id), headcount: Number(newRecord.headcount) });
      setAddStatus("Added — refreshing dashboard...");
      clearCachedData("occupancy");
      refreshAllData();
      setNewRecord({ room_id: "", timestamp: "", headcount: "" });
      setTimeout(() => setAddStatus(""), 2000);
    } catch (err) {
      console.error(err);
      setAddStatus("Failed to add — check console");
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      await deleteOccupancyRecord(recordId);
      clearCachedData("occupancy");
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!analytics || !heatmap) return <p style={{ padding: 40, color: "#8792A6" }}>Loading occupancy data...</p>;

  const filteredEvents = overcrowding
    ? overcrowding.events.filter(e => e.room_name.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Occupancy Monitoring — Facility 01</h1>
        <span className="status-tag">● Live</span>
      </div>

      <div className="dash-grid cols-3">
        <div className="panel gauge-card">
          <p className="panel-title">Avg Utilization</p>
          <SemiGauge percent={analytics.avg_utilization_pct} value={`${analytics.avg_utilization_pct}%`} subLabel="of capacity" color="#F5B942" />
        </div>
        <div className="panel">
          <p className="panel-title">Facility Overview</p>
          <div className="stat-inline-row">
            <div className="stat-inline-item">
              <span className="stat-inline-label">Total Rooms</span>
              <span className="stat-inline-value mono" style={{ color: "var(--cyan)" }}>{analytics.total_rooms}</span>
            </div>
            <div className="stat-inline-item">
              <span className="stat-inline-label">Peak Utilization</span>
              <span className="stat-inline-value mono" style={{ color: "var(--amber)" }}>{analytics.peak_utilization_pct}%</span>
            </div>
          </div>
        </div>
        <div className="panel">
          <p className="panel-title">Attention Needed</p>
          <div className="stat-inline-row">
            <div className="stat-inline-item">
              <span className="stat-inline-label">Overcrowding Events</span>
              <span className="stat-inline-value mono" style={{ color: "var(--danger)" }}>{analytics.total_overcrowding_events}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <p className="panel-title">Add / Remove Real Data</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Room</label>
            <select value={newRecord.room_id} onChange={(e) => setNewRecord({ ...newRecord, room_id: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4" }}>
              <option value="">Select room</option>
              {roomOptions.map(r => <option key={r.room_id} value={r.room_id}>{r.room_name} (cap. {r.capacity})</option>)}
            </select>
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Timestamp</label>
            <input type="datetime-local" value={newRecord.timestamp}
              onChange={(e) => setNewRecord({ ...newRecord, timestamp: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4" }} />
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Headcount</label>
            <input type="number" value={newRecord.headcount}
              onChange={(e) => setNewRecord({ ...newRecord, headcount: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4", width: 90 }} />
          </div>
          <button onClick={handleAddRecord} disabled={!newRecord.room_id || !newRecord.timestamp}
            style={{ background: "var(--cyan)", border: "none", borderRadius: 6, padding: "9px 20px", fontWeight: 600, cursor: "pointer" }}>
            Add Reading
          </button>
          {addStatus && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{addStatus}</span>}
        </div>

        <p className="panel-title">Recent Readings (click to delete)</p>
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          <table className="data-table">
            <thead><tr><th>Room</th><th>Timestamp</th><th>Headcount</th><th></th></tr></thead>
            <tbody>
              {recentRecords.map((r) => (
                <tr key={r.record_id}>
                  <td>{r.room_name}</td>
                  <td className="mono" style={{ color: "var(--text-muted)" }}>{r.timestamp}</td>
                  <td className="mono">{r.headcount}</td>
                  <td>
                    <button onClick={() => handleDeleteRecord(r.record_id)}
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

      <div className="panel" style={{ marginBottom: 16 }}>
        <p className="panel-title">Room Utilization Heatmap</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {heatmap.map(room => {
            const c = getHeatColor(room.peak_utilization);
            return (
              <div key={room.room_id} style={{
                background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "16px 14px"
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#E8ECF4" }}>{room.room_name}</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 24, fontWeight: 700, color: c.border }}>{room.avg_utilization}%</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.labelColor, marginTop: 4 }}>{c.label}</div>
                <div style={{ fontSize: 11, opacity: 0.7, color: "#8792A6", marginTop: 2 }}>peak {room.peak_utilization}% · {room.overcrowding_count} events</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dash-grid cols-2-even">
        <div className="panel">
          <p className="panel-title">Average Utilization by Room</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={roomComparison || []} layout="vertical">
              <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="room_name" stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} width={110} />
              <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} />
              <Bar dataKey="avg_utilization" fill="#34D3C9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {dayData && (
          <div className="panel">
            <p className="panel-title">Utilization by Day of Week</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={Object.entries(dayData.avg_by_day_of_week).map(([day, value]) => ({ day: day.slice(0, 3), value }))}>
                <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} cursor={{ fill: "rgba(52, 211, 201, 0.08)" }} />
                <Bar dataKey="value" fill="#34D3C9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {overcrowding && (
        <div className="panel">
          <p className="panel-title">
            Overcrowding Events
            <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{overcrowding.total_events} total</span>
          </p>
          <input
            type="text" placeholder="Search by room..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "7px 10px", color: "#E8ECF4", width: "100%", marginBottom: 14, fontSize: 13 }}
          />
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            <table className="data-table">
              <thead><tr><th>Room</th><th>Headcount / Capacity</th><th>% Over</th><th>Timestamp</th></tr></thead>
              <tbody>
                {filteredEvents.map((e, i) => (
                  <tr key={i}>
                    <td>{e.room_name}</td>
                    <td className="mono">{e.headcount} / {e.capacity}</td>
                    <td><span className="badge spike">+{e.pct_over}%</span></td>
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

      <div className="panel">
        <p className="panel-title">Occupancy Recommendations</p>
        <ul className="rec-list">
          {recommendations.map((rec, i) => <li key={i} className="rec-item">{rec}</li>)}
        </ul>
      </div>
    </div>
  );
}
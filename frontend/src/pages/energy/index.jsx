import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar, Legend } from "recharts";
import { getEnergyAnalytics, getEnergyRecommendations, getTemperatureCorrelation, getDayOfWeekBreakdown, getAnomalies, getMonthlyTrend, getAnomalyDetail, getRecentEnergyReadings, addEnergyReading, deleteEnergyReading } from "../../services/api";
import "../../App.css";

function SemiGauge({ percent, value, subLabel, color }) {
  const r = 80;
  const path = `M 20 100 A ${r} ${r} 0 0 1 180 100`;
  const length = Math.PI * r;
  const offset = length * (1 - percent / 100);

  return (
    <svg width="200" height="120" viewBox="0 0 200 120">
      <path d={path} fill="none" stroke="#1F2A44" strokeWidth="14" strokeLinecap="round" />
      <path d={path} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={length} strokeDashoffset={offset} />
      <text x="100" y="90" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="26" fontWeight="700" fill="#E8ECF4">
        {value}
      </text>
      <text x="100" y="110" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#8792A6">
        {subLabel}
      </text>
    </svg>
  );
}

export default function EnergyDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [tempData, setTempData] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [anomalyData, setAnomalyData] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [anomalyFilter, setAnomalyFilter] = useState("all"); // "all" | "spike" | "drop"
  const [anomalySearch, setAnomalySearch] = useState("");
  const [newReading, setNewReading] = useState({ timestamp: "", power_consumption: "", outdoor_temp: "", occupancy: "" });
  const [recentReadings, setRecentReadings] = useState([]);
  const [addStatus, setAddStatus] = useState("");

  const refreshAllData = () => {
    getEnergyAnalytics().then(setAnalytics);
    getEnergyRecommendations().then(setRecommendations);
    getTemperatureCorrelation().then(setTempData);
    getDayOfWeekBreakdown().then(setDayData);
    getAnomalies().then(setAnomalyData);
    getMonthlyTrend().then(setMonthlyTrend);
    getRecentEnergyReadings().then(setRecentReadings);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const handleAddReading = async () => {
    setAddStatus("Adding...");
    try {
      await addEnergyReading(newReading);
      setAddStatus("Added — refreshing dashboard...");
      refreshAllData();
      setNewReading({ timestamp: "", power_consumption: "", outdoor_temp: "", occupancy: "" });
      setTimeout(() => setAddStatus(""), 2000);
    } catch (err) {
      console.error(err);
      setAddStatus("Failed to add — check console");
    }
  };

  const handleDeleteReading = async (recordId) => {
    try {
      await deleteEnergyReading(recordId);
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const openAnomalyDetail = async (timestamp) => {
    const detail = await getAnomalyDetail(timestamp);
    setSelectedAnomaly(detail);
  };

  if (!analytics) return <p style={{ padding: 40, color: "#8792A6" }}>Loading energy data...</p>;

  const hourlyData = Object.entries(analytics.avg_by_hour).map(([hour, value]) => ({
    hour: `${hour}:00`,
    consumption: value
  }));

  const gaugePercent = Math.min((analytics.average_consumption / analytics.peak_consumption) * 100, 100);

  const wdEntries = Object.entries(analytics.avg_weekday_vs_weekend || {});
  const weekdayEntry = wdEntries.find(([k]) => k.toLowerCase() === "false");
  const weekendEntry = wdEntries.find(([k]) => k.toLowerCase() === "true");
  const weekdayAvg = weekdayEntry ? weekdayEntry[1] : null;
  const weekendAvg = weekendEntry ? weekendEntry[1] : null;
  const weekendRatio = weekdayAvg && weekendAvg ? Math.min(100, Math.round((weekendAvg / weekdayAvg) * 100)) : 0;

  const filteredAnomalies = anomalyData
    ? anomalyData.anomalies.filter(a => {
        const matchesType = anomalyFilter === "all" || a.type === anomalyFilter;
        const matchesSearch = a.timestamp.toLowerCase().includes(anomalySearch.toLowerCase());
        return matchesType && matchesSearch;
      })
    : [];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Energy Monitoring — Facility 01</h1>
        <span className="status-tag">● Live</span>
      </div>

      {/* Row 1 */}
      <div className="dash-grid cols-3">
        <div className="panel gauge-card">
          <p className="panel-title">Avg vs Peak Load</p>
          <SemiGauge percent={gaugePercent} value={analytics.average_consumption} subLabel={`of ${analytics.peak_consumption} peak`} color="#F5B942" />
        </div>

        <div className="panel">
          <p className="panel-title">Consumption Overview</p>
          <div className="stat-inline-row">
            <div className="stat-inline-item">
              <span className="stat-inline-label">Average</span>
              <span className="stat-inline-value" style={{ color: "var(--amber)" }}>{analytics.average_consumption}<span className="stat-inline-unit">kWh</span></span>
            </div>
            <div className="stat-inline-item">
              <span className="stat-inline-label">Peak</span>
              <span className="stat-inline-value" style={{ color: "var(--amber)" }}>{analytics.peak_consumption}<span className="stat-inline-unit">kWh</span></span>
            </div>
          </div>
        </div>

        <div className="panel">
          <p className="panel-title">Range</p>
          <div className="stat-inline-row">
            <div className="stat-inline-item">
              <span className="stat-inline-label">Lowest</span>
              <span className="stat-inline-value" style={{ color: "var(--cyan)" }}>{analytics.lowest_consumption}<span className="stat-inline-unit">kWh</span></span>
            </div>
            <div className="stat-inline-item">
              <span className="stat-inline-label">Anomalies</span>
              <span className="stat-inline-value" style={{ color: "var(--danger)" }}>{anomalyData ? anomalyData.total_anomalies : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Remove Real Data panel */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <p className="panel-title">Add / Remove Real Data</p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Timestamp</label>
            <input type="datetime-local" value={newReading.timestamp}
              onChange={(e) => setNewReading({ ...newReading, timestamp: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4" }} />
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Power (kWh)</label>
            <input type="number" value={newReading.power_consumption}
              onChange={(e) => setNewReading({ ...newReading, power_consumption: Number(e.target.value) })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4", width: 100 }} />
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Outdoor Temp</label>
            <input type="number" value={newReading.outdoor_temp}
              onChange={(e) => setNewReading({ ...newReading, outdoor_temp: Number(e.target.value) })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4", width: 100 }} />
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Occupancy</label>
            <input type="number" value={newReading.occupancy}
              onChange={(e) => setNewReading({ ...newReading, occupancy: Number(e.target.value) })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4", width: 80 }} />
          </div>
          <button onClick={handleAddReading}
            style={{ background: "var(--cyan)", border: "none", borderRadius: 6, padding: "9px 20px", fontWeight: 600, cursor: "pointer" }}>
            Add Reading
          </button>
          {addStatus && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{addStatus}</span>}
        </div>

        <p className="panel-title">Recent Readings (click to delete)</p>
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          <table className="data-table">
            <thead><tr><th>Timestamp</th><th>Power</th><th>Temp</th><th>Occ.</th><th></th></tr></thead>
            <tbody>
              {recentReadings.map((r) => (
                <tr key={r.record_id}>
                  <td className="mono" style={{ color: "var(--text-muted)" }}>{r.timestamp}</td>
                  <td className="mono">{r.power_consumption} kWh</td>
                  <td className="mono">{r.outdoor_temp}°C</td>
                  <td className="mono">{r.occupancy}</td>
                  <td>
                    <button onClick={() => handleDeleteReading(r.record_id)}
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

      {/* Row 2: small gauge + hourly trend chart, side by side */}
      <div className="dash-grid cols-gauge-chart">
        <div className="panel gauge-card">
          <p className="panel-title">Weekend Load</p>
          <SemiGauge percent={weekendRatio} value={`${weekendRatio}%`} subLabel="of weekday avg" color="var(--cyan)" />
        </div>

        <div className="panel chart-card">
          <p className="panel-title">Average Consumption by Hour</p>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="fillAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5B942" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#F5B942" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" stroke="#8792A6" fontSize={11} tickLine={false} axisLine={false} interval={0} />
              <YAxis stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} labelStyle={{ color: "#8792A6" }} />
              <Area type="monotone" dataKey="consumption" stroke="#F5B942" strokeWidth={2} fill="url(#fillAmber)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: bar chart + anomaly table */}
      <div className="dash-grid cols-2-even">
        {dayData && (
          <div className="panel">
            <p className="panel-title">Average Consumption by Day of Week</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={Object.entries(dayData.avg_by_day_of_week).map(([day, value]) => ({ day: day.slice(0, 3), consumption: value }))}>
                <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} cursor={{ fill: "rgba(245, 185, 66, 0.08)" }} />
                <Bar dataKey="consumption" fill="#F5B942" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {anomalyData && (
          <div className="panel">
            <p className="panel-title">
              Detected Anomalies
              <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{anomalyData.total_anomalies} total</span>
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <input
                type="text"
                placeholder="Search by timestamp..."
                value={anomalySearch}
                onChange={(e) => setAnomalySearch(e.target.value)}
                style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "7px 10px", color: "#E8ECF4", flex: 1, fontSize: 13 }}
              />
              <select
                value={anomalyFilter}
                onChange={(e) => setAnomalyFilter(e.target.value)}
                style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "7px 10px", color: "#E8ECF4", fontSize: 13 }}
              >
                <option value="all">All Types</option>
                <option value="spike">Spikes Only</option>
                <option value="drop">Drops Only</option>
              </select>
            </div>

            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr><th>Type</th><th>Value</th><th>Timestamp</th></tr>
                </thead>
                <tbody>
                  {filteredAnomalies.map((a, i) => (
                    <tr key={i} onClick={() => openAnomalyDetail(a.timestamp)} style={{ cursor: "pointer" }}>
                      <td><span className={`badge ${a.type}`}>{a.type}</span></td>
                      <td className="mono">{a.power_consumption} kWh</td>
                      <td className="mono" style={{ color: "var(--text-muted)" }}>{a.timestamp}</td>
                    </tr>
                  ))}
                  {filteredAnomalies.length === 0 && (
                    <tr><td colSpan="3" style={{ textAlign: "center", color: "var(--text-muted)", padding: "16px 0" }}>No matching readings</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {selectedAnomaly && !selectedAnomaly.error && (
          <div className="modal-overlay" onClick={() => setSelectedAnomaly(null)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedAnomaly(null)}>×</button>
              <h2 style={{ marginTop: 0, marginBottom: 4 }}>
                {selectedAnomaly.type === "spike" ? "▲ Spike" : "▼ Drop"} Detected
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>{selectedAnomaly.timestamp}</p>

              <div className="stat-cluster" style={{ marginBottom: 20 }}>
                <div className="stat-cluster-item">
                  <span className="stat-cluster-label">Consumption</span>
                  <span className="stat-cluster-value mono" style={{ color: selectedAnomaly.type === "spike" ? "var(--danger)" : "var(--cyan)" }}>
                    {selectedAnomaly.power_consumption} kWh
                  </span>
                </div>
                <div className="stat-cluster-item">
                  <span className="stat-cluster-label">Deviation from Average</span>
                  <span className="stat-cluster-value mono">{selectedAnomaly.deviation_from_mean_pct > 0 ? "+" : ""}{selectedAnomaly.deviation_from_mean_pct}%</span>
                </div>
                <div className="stat-cluster-item">
                  <span className="stat-cluster-label">Z-Score</span>
                  <span className="stat-cluster-value mono">{selectedAnomaly.z_score}</span>
                </div>
              </div>

              <p className="panel-title">Conditions at This Reading</p>
              <div className="stat-inline-row" style={{ marginBottom: 20 }}>
                <div className="stat-inline-item">
                  <span className="stat-inline-label">Outdoor Temp</span>
                  <span className="stat-inline-value mono">{selectedAnomaly.outdoor_temp}°C</span>
                </div>
                <div className="stat-inline-item">
                  <span className="stat-inline-label">Occupancy</span>
                  <span className="stat-inline-value mono">{selectedAnomaly.occupancy}</span>
                </div>
                <div className="stat-inline-item">
                  <span className="stat-inline-label">Day</span>
                  <span className="stat-inline-value mono" style={{ fontSize: 16 }}>{selectedAnomaly.day_of_week}</span>
                </div>
              </div>

              <p className="panel-title">±2 Hour Context</p>
              <table className="data-table">
                <thead><tr><th>Time</th><th>Consumption</th></tr></thead>
                <tbody>
                  {selectedAnomaly.context_readings.map((r, i) => (
                    <tr key={i} style={r.is_target ? { background: "rgba(242, 84, 91, 0.1)" } : {}}>
                      <td className="mono" style={{ color: "var(--text-muted)" }}>{r.timestamp}</td>
                      <td className="mono" style={{ fontWeight: r.is_target ? 700 : 400 }}>{r.power_consumption} kWh</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Row 4: dual-line monthly trend overlay, full width */}
      {monthlyTrend && (
        <div className="panel chart-card">
          <p className="panel-title">Consumption vs. Outdoor Temperature — Monthly Trend</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="fillConsumption" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5B942" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#F5B942" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D3C9" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#34D3C9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} />
              <Legend
                formatter={(value) => <span style={{ color: "#8792A6", fontSize: 12 }}>{value}</span>}
                iconType="circle"
              />
              <Area yAxisId="left" type="monotone" dataKey="avg_consumption" name="Consumption (kWh)" stroke="#F5B942" strokeWidth={2} fill="url(#fillConsumption)" />
              <Area yAxisId="right" type="monotone" dataKey="avg_temp" name="Outdoor Temp (°C)" stroke="#34D3C9" strokeWidth={2} fill="url(#fillTemp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recommendations */}
      <div className="panel">
        <p className="panel-title">Efficiency Recommendations</p>
        <ul className="rec-list">
          {recommendations.map((rec, i) => (
            <li key={i} className="rec-item">{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getMaintenanceHealthScores, getMaintenanceAlerts, getMaintenanceRecommendations, getAssetDetail, addMaintenanceRecord, deleteMaintenanceRecord, getRecentMaintenanceRecords, getAssetList } from "../../services/api";
import "../../App.css";

function healthColor(score) {
  if (score >= 80) return "#34D3C9";
  if (score >= 60) return "#F5B942";
  return "#F2545B";
}

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

export default function MaintenanceDashboard() {
  const [healthScores, setHealthScores] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [riskSearch, setRiskSearch] = useState("");
  const [riskAssetFilter, setRiskAssetFilter] = useState("all");
  const [assetOptions, setAssetOptions] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [addStatus, setAddStatus] = useState("");
  const [newRecord, setNewRecord] = useState({
    asset_id: "", product_id: "", product_type: "M",
    air_temperature: 298.5, process_temperature: 308.8,
    rotational_speed: 1500, torque: 40, tool_wear: 50,
    machine_failure: false, failure_type: ""
  });

  const refreshAllData = () => {
    getMaintenanceHealthScores().then(setHealthScores);
    getMaintenanceAlerts().then(setAlerts);
    getMaintenanceRecommendations().then(setRecommendations);
    getRecentMaintenanceRecords().then(setRecentRecords);
    getAssetList().then(setAssetOptions);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const openAssetDetail = async (assetId) => {
    setDetailLoading(true);
    const detail = await getAssetDetail(assetId);
    setSelectedAsset(detail);
    setDetailLoading(false);
  };

  const handleAddRecord = async () => {
    setAddStatus("Adding...");
    try {
      await addMaintenanceRecord({
        ...newRecord,
        asset_id: Number(newRecord.asset_id),
        failure_type: newRecord.machine_failure ? (newRecord.failure_type || "Unspecified") : null
      });
      setAddStatus("Added — refreshing dashboard...");
      refreshAllData();
      setTimeout(() => setAddStatus(""), 2000);
    } catch (err) {
      console.error(err);
      setAddStatus("Failed to add — check console");
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      await deleteMaintenanceRecord(recordId);
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!healthScores || !alerts) return <p style={{ padding: 40, color: "#8792A6" }}>Loading maintenance data...</p>;

  const chartData = healthScores.map(a => ({ name: a.asset_type, health_score: a.health_score }));
  const critical = healthScores.filter(a => a.health_score < 60);
  const moderate = healthScores.filter(a => a.health_score >= 60 && a.health_score < 80);
  const good = healthScores.filter(a => a.health_score >= 80);
  const worstAsset = healthScores[0];
  const overallHealthPercent = Math.round(healthScores.reduce((sum, a) => sum + a.health_score, 0) / healthScores.length);
  const totalFailures = healthScores.reduce((sum, a) => sum + a.total_failures, 0);
  const percentHealthy = Math.round((healthScores.filter(a => a.health_score >= 80).length / healthScores.length) * 100);

  const assetTypeOptions = ["all", ...new Set(alerts.alerts.map(a => a.asset_type))];

  const filteredAlerts = alerts.alerts.filter(a => {
    const matchesAsset = riskAssetFilter === "all" || a.asset_type === riskAssetFilter;
    const matchesSearch = a.asset_type.toLowerCase().includes(riskSearch.toLowerCase());
    return matchesAsset && matchesSearch;
  });

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Maintenance Monitoring — Facility 01</h1>
        <span className="status-tag">● Live</span>
      </div>

      {/* Row 1 */}
      <div className="dash-grid cols-3">
        <div className="panel gauge-card">
          <p className="panel-title">Fleet Health</p>
          <SemiGauge percent={overallHealthPercent} value={overallHealthPercent} subLabel="avg score /100" color={healthColor(overallHealthPercent)} />
        </div>

        <div className="panel">
          <p className="panel-title">Fleet Overview</p>
          <div className="stat-inline-row">
            <div className="stat-inline-item">
              <span className="stat-inline-label">Total Assets</span>
              <span className="stat-inline-value" style={{ color: "var(--cyan)" }}>{healthScores.length}</span>
            </div>
            <div className="stat-inline-item">
              <span className="stat-inline-label">High-Risk Readings</span>
              <span className="stat-inline-value" style={{ color: "var(--amber)" }}>{alerts.total_high_risk_readings}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <p className="panel-title">Attention Needed</p>
          <div className="stat-inline-row">
            <div className="stat-inline-item">
              <span className="stat-inline-label">Lowest Score</span>
              <span className="stat-inline-value" style={{ color: "var(--danger)" }}>{worstAsset.health_score}</span>
            </div>
            <div className="stat-inline-item">
              <span className="stat-inline-label">Failures Logged</span>
              <span className="stat-inline-value" style={{ color: "var(--text)" }}>{totalFailures}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Remove Real Data panel */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <p className="panel-title">Add / Remove Real Data</p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Asset</label>
            <select value={newRecord.asset_id} onChange={(e) => setNewRecord({ ...newRecord, asset_id: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4" }}>
              <option value="">Select asset</option>
              {assetOptions.map(a => (
                <option key={a.asset_id} value={a.asset_id}>{a.asset_type} (#{a.asset_id})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Product ID</label>
            <input type="text" value={newRecord.product_id}
              onChange={(e) => setNewRecord({ ...newRecord, product_id: e.target.value })}
              placeholder="e.g. M99999"
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4", width: 110 }} />
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Type</label>
            <select value={newRecord.product_type} onChange={(e) => setNewRecord({ ...newRecord, product_type: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4" }}>
              <option value="L">L</option><option value="M">M</option><option value="H">H</option>
            </select>
          </div>
          {[
            ["Air Temp (K)", "air_temperature"], ["Process Temp (K)", "process_temperature"],
            ["Rot. Speed (rpm)", "rotational_speed"], ["Torque (Nm)", "torque"], ["Tool Wear (min)", "tool_wear"]
          ].map(([label, key]) => (
            <div key={key}>
              <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>{label}</label>
              <input type="number" value={newRecord[key]}
                onChange={(e) => setNewRecord({ ...newRecord, [key]: Number(e.target.value) })}
                style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4", width: 100 }} />
            </div>
          ))}
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Failure?</label>
            <select value={newRecord.machine_failure} onChange={(e) => setNewRecord({ ...newRecord, machine_failure: e.target.value === "true" })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4" }}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
          <button onClick={handleAddRecord} disabled={!newRecord.asset_id || !newRecord.product_id}
            style={{ background: "var(--cyan)", border: "none", borderRadius: 6, padding: "9px 20px", fontWeight: 600, cursor: "pointer" }}>
            Add Record
          </button>
          {addStatus && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{addStatus}</span>}
        </div>

        <p className="panel-title">Recent Records (click to delete)</p>
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          <table className="data-table">
            <thead><tr><th>Asset</th><th>Type</th><th>Torque</th><th>Tool Wear</th><th>Failure</th><th></th></tr></thead>
            <tbody>
              {recentRecords.map((r) => (
                <tr key={r.record_id}>
                  <td className="mono" style={{ color: "var(--text-muted)" }}>#{r.asset_id}</td>
                  <td className="mono">{r.product_type}</td>
                  <td className="mono">{r.torque}</td>
                  <td className="mono">{r.tool_wear}</td>
                  <td>{r.machine_failure ? <span className="badge spike">Yes</span> : <span className="badge drop">No</span>}</td>
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

      {/* Row 2: small gauge + health score bar chart, side by side */}
      <div className="dash-grid cols-gauge-chart">
        <div className="panel gauge-card">
          <p className="panel-title">Healthy Assets</p>
          <SemiGauge percent={percentHealthy} value={`${percentHealthy}%`} subLabel="score ≥ 80" color="var(--cyan)" />
        </div>

        <div className="panel chart-card">
          <p className="panel-title">Asset Health Scores</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} width={120} />
              <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} />
              <Bar dataKey="health_score" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={healthColor(entry.health_score)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Equipment status groups */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <p className="panel-title">Equipment Status — Click for Details</p>
        <div className="status-group-grid">
          <div>
            <div className="status-group-header" style={{ color: "var(--danger)" }}>
              <span className="status-dot" style={{ background: "var(--danger)" }}></span> Critical ({critical.length})
            </div>
            {critical.map(a => (
              <div key={a.asset_id} className="equipment-card" onClick={() => openAssetDetail(a.asset_id)}>
                <div className="equipment-card-name">{a.asset_type}</div>
                <div className="equipment-card-score">Score: {a.health_score}</div>
              </div>
            ))}
            {critical.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>None</p>}
          </div>

          <div>
            <div className="status-group-header" style={{ color: "var(--amber)" }}>
              <span className="status-dot" style={{ background: "var(--amber)" }}></span> Moderate ({moderate.length})
            </div>
            {moderate.map(a => (
              <div key={a.asset_id} className="equipment-card" onClick={() => openAssetDetail(a.asset_id)}>
                <div className="equipment-card-name">{a.asset_type}</div>
                <div className="equipment-card-score">Score: {a.health_score}</div>
              </div>
            ))}
            {moderate.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>None</p>}
          </div>

          <div>
            <div className="status-group-header" style={{ color: "var(--cyan)" }}>
              <span className="status-dot" style={{ background: "var(--cyan)" }}></span> Good ({good.length})
            </div>
            {good.map(a => (
              <div key={a.asset_id} className="equipment-card" onClick={() => openAssetDetail(a.asset_id)}>
                <div className="equipment-card-name">{a.asset_type}</div>
                <div className="equipment-card-score">Score: {a.health_score}</div>
              </div>
            ))}
            {good.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>None</p>}
          </div>
        </div>
      </div>

      {/* Row 3: high-risk readings, table-styled */}
      <div className="panel">
        <p className="panel-title">
          High-Risk Readings
          <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{alerts.total_high_risk_readings} total</span>
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <input
            type="text"
            placeholder="Search by equipment name..."
            value={riskSearch}
            onChange={(e) => setRiskSearch(e.target.value)}
            style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "7px 10px", color: "#E8ECF4", flex: 1, fontSize: 13 }}
          />
          <select
            value={riskAssetFilter}
            onChange={(e) => setRiskAssetFilter(e.target.value)}
            style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "7px 10px", color: "#E8ECF4", fontSize: 13 }}
          >
            {assetTypeOptions.map(opt => (
              <option key={opt} value={opt}>{opt === "all" ? "All Equipment" : opt}</option>
            ))}
          </select>
        </div>

        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          <table className="data-table">
            <thead><tr><th>Asset</th><th>Risk</th><th>Tool Wear</th></tr></thead>
            <tbody>
              {filteredAlerts.map((a, i) => (
                <tr key={i}>
                  <td>{a.asset_type}</td>
                  <td><span className="badge spike">{(a.failure_probability * 100).toFixed(1)}%</span></td>
                  <td className="mono" style={{ color: "var(--text-muted)" }}>{a.tool_wear} min</td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr><td colSpan="3" style={{ textAlign: "center", color: "var(--text-muted)", padding: "16px 0" }}>No matching readings</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="panel">
        <p className="panel-title">Maintenance Recommendations</p>
        <ul className="rec-list">
          {recommendations.map((rec, i) => (
            <li key={i} className="rec-item">{rec}</li>
          ))}
        </ul>
      </div>

      {/* Asset detail modal */}
      {selectedAsset && (
        <div className="modal-overlay" onClick={() => setSelectedAsset(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedAsset(null)}>×</button>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>{selectedAsset.asset_type}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>Asset ID {selectedAsset.asset_id} · {selectedAsset.status}</p>

            <div className="stat-cluster" style={{ marginBottom: 20 }}>
              <div className="stat-cluster-item">
                <span className="stat-cluster-label">Health Score</span>
                <span className="stat-cluster-value mono" style={{ color: healthColor(selectedAsset.health_score) }}>{selectedAsset.health_score}</span>
              </div>
              <div className="stat-cluster-item">
                <span className="stat-cluster-label">Total Readings</span>
                <span className="stat-cluster-value mono">{selectedAsset.total_readings}</span>
              </div>
              <div className="stat-cluster-item">
                <span className="stat-cluster-label">Total Failures</span>
                <span className="stat-cluster-value mono" style={{ color: "var(--danger)" }}>{selectedAsset.total_failures}</span>
              </div>
            </div>

            <p className="panel-title">Average Sensor Readings</p>
            <div className="stat-inline-row" style={{ marginBottom: 20 }}>
              <div className="stat-inline-item">
                <span className="stat-inline-label">Torque</span>
                <span className="stat-inline-value mono">{selectedAsset.avg_torque}</span>
              </div>
              <div className="stat-inline-item">
                <span className="stat-inline-label">Tool Wear</span>
                <span className="stat-inline-value mono">{selectedAsset.avg_tool_wear}</span>
              </div>
              <div className="stat-inline-item">
                <span className="stat-inline-label">Rot. Speed</span>
                <span className="stat-inline-value mono">{selectedAsset.avg_rotational_speed}</span>
              </div>
            </div>

            {Object.keys(selectedAsset.failure_type_breakdown).length > 0 && (
              <>
                <p className="panel-title">Failure Types Logged</p>
                <ul className="rec-list" style={{ marginBottom: 20 }}>
                  {Object.entries(selectedAsset.failure_type_breakdown).map(([type, count]) => (
                    <li key={type} className="rec-item" style={{ borderLeftColor: "var(--danger)" }}>{type}: {count}</li>
                  ))}
                </ul>
              </>
            )}

            <p className="panel-title">Top Risky Readings</p>
            <table className="data-table">
              <thead><tr><th>Risk</th><th>Torque</th><th>Tool Wear</th></tr></thead>
              <tbody>
                {selectedAsset.top_risky_readings.map((r, i) => (
                  <tr key={i}>
                    <td><span className="badge spike">{(r.failure_probability * 100).toFixed(1)}%</span></td>
                    <td className="mono">{r.torque}</td>
                    <td className="mono">{r.tool_wear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
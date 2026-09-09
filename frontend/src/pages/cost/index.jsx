import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getCostAnalytics, getCostDistribution, getCostTrend, getCategoryDetail, getFacilityHealthScore, getCostRecommendations, addCostEntry, deleteCostEntry, getRecentCostEntries } from "../../services/api";
import { getCachedData, setCachedData, clearCachedData } from "../../utils/dashboardCache";
import "../../App.css";

const CATEGORY_COLORS = {
  Energy: "#F5B942",
  Maintenance: "#F2545B",
  Security: "#8B5CF6",
  Administrative: "#34D3C9",
};

export default function CostDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [trend, setTrend] = useState(null);
  const [health, setHealth] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [addStatus, setAddStatus] = useState("");
  const [newEntry, setNewEntry] = useState({ category: "energy", amount: "", period: "", description: "" });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryDetail, setCategoryDetail] = useState(null);

  const applyData = (d) => {
    setAnalytics(d.analytics);
    setDistribution(d.distribution);
    setTrend(d.trend);
    setHealth(d.health);
    setRecommendations(d.recommendations);
    setRecentEntries(d.recentEntries);
  };

  const refreshAllData = () => {
    Promise.all([
      getCostAnalytics(),
      getCostDistribution(),
      getCostTrend(),
      getFacilityHealthScore(),
      getCostRecommendations(),
      getRecentCostEntries(),
    ]).then(([analytics, distribution, trend, health, recommendations, recentEntries]) => {
      const bundle = { analytics, distribution, trend, health, recommendations, recentEntries };
      applyData(bundle);
      setCachedData("cost", bundle);
    });
  };

  useEffect(() => {
    const cached = getCachedData("cost");
    if (cached) {
      applyData(cached);
    } else {
      refreshAllData();
    }
  }, []);

  const handleAddEntry = async () => {
    setAddStatus("Adding...");
    try {
      await addCostEntry({ ...newEntry, amount: Number(newEntry.amount) });
      setAddStatus("Added — refreshing dashboard...");
      clearCachedData("cost");
      refreshAllData();
      setNewEntry({ category: "energy", amount: "", period: "", description: "" });
      setTimeout(() => setAddStatus(""), 2000);
    } catch (err) {
      console.error(err);
      setAddStatus("Failed to add — check console");
    }
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      await deleteCostEntry(entryId);
      clearCachedData("cost");
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const openCategoryDetail = async (category) => {
    setSelectedCategory(category);
    setCategoryDetail(null);
    const detail = await getCategoryDetail(category.toLowerCase());
    setCategoryDetail(detail);
  };

  if (!analytics || !distribution || !health) return <p style={{ padding: 40, color: "#8792A6" }}>Loading cost data...</p>;

  const radarData = Object.entries(health.breakdown).map(([key, value]) => ({
    subject: key.charAt(0).toUpperCase() + key.slice(1),
    score: value,
    fullMark: 100
  }));

  const potentialSavings = Math.round(analytics.total_cost * 0.08);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Cost Optimization — Facility 01</h1>
        <span className="status-tag">● Live</span>
      </div>

      <div className="dash-grid cols-4-even" style={{ marginBottom: 16 }}>
        <div className="panel">
          <p className="stat-label">Total Operational Cost</p>
          <span className="stat-value" style={{ color: "var(--amber)" }}>₹{analytics.total_cost.toLocaleString()}</span>
        </div>
        <div className="panel">
          <p className="stat-label">Cost Change</p>
          <span className="stat-value" style={{ color: analytics.cost_change_pct > 0 ? "var(--danger)" : "var(--cyan)" }}>
            {analytics.cost_change_pct > 0 ? "+" : ""}{analytics.cost_change_pct}%
          </span>
        </div>
        <div className="panel">
          <p className="stat-label">Facility Health</p>
          <span className="stat-value" style={{ color: "var(--cyan)" }}>{health.composite_score}<span className="stat-unit">/100</span></span>
        </div>
        <div className="panel">
          <p className="stat-label">Potential Savings</p>
          <span className="stat-value" style={{ color: "var(--danger)" }}>₹{potentialSavings.toLocaleString()}</span>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <p className="panel-title">Add / Remove Cost Entry</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Category</label>
            <select value={newEntry.category} onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4" }}>
              <option value="energy">Energy</option>
              <option value="maintenance">Maintenance</option>
              <option value="security">Security</option>
              <option value="administrative">Administrative</option>
            </select>
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Amount (₹)</label>
            <input type="number" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4", width: 120 }} />
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Period (YYYY-MM)</label>
            <input type="text" placeholder="2018-07" value={newEntry.period} onChange={(e) => setNewEntry({ ...newEntry, period: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4", width: 100 }} />
          </div>
          <div>
            <label className="stat-inline-label" style={{ display: "block", marginBottom: 6 }}>Description</label>
            <input type="text" value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
              style={{ background: "#0B1220", border: "1px solid #1F2A44", borderRadius: 6, padding: "8px 10px", color: "#E8ECF4", width: 180 }} />
          </div>
          <button onClick={handleAddEntry} disabled={!newEntry.amount || !newEntry.period}
            style={{ background: "var(--cyan)", border: "none", borderRadius: 6, padding: "9px 20px", fontWeight: 600, cursor: "pointer" }}>
            Add Entry
          </button>
          {addStatus && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{addStatus}</span>}
        </div>

        <p className="panel-title">Recent Entries (click to delete)</p>
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          <table className="data-table">
            <thead><tr><th>Category</th><th>Amount</th><th>Period</th><th>Description</th><th></th></tr></thead>
            <tbody>
              {recentEntries.map((e) => (
                <tr key={e.entry_id}>
                  <td>{e.category}</td>
                  <td className="mono">₹{e.amount.toLocaleString()}</td>
                  <td className="mono" style={{ color: "var(--text-muted)" }}>{e.period}</td>
                  <td>{e.description}</td>
                  <td>
                    <button onClick={() => handleDeleteEntry(e.entry_id)}
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

      <div className="dash-grid cols-2-even">
        <div className="panel">
          <p className="panel-title">Cost Distribution</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={distribution} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3}>
                {distribution.map((entry, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[entry.category] || "#8792A6"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} formatter={(v) => `₹${v.toLocaleString()}`} />
              <Legend formatter={(value) => <span style={{ color: "#8792A6", fontSize: 12 }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <p className="panel-title">Facility Health Breakdown</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1F2A44" />
              <PolarAngleAxis dataKey="subject" stroke="#8792A6" fontSize={12} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#1F2A44" fontSize={10} />
              <Radar name="Health Score" dataKey="score" stroke="#34D3C9" fill="#34D3C9" fillOpacity={0.35} />
              <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel chart-card">
        <p className="panel-title">Monthly Cost Trend</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F5B942" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#F5B942" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} formatter={(v) => `₹${v.toLocaleString()}`} />
            <Area type="monotone" dataKey="amount" stroke="#F5B942" strokeWidth={2} fill="url(#fillCost)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <p className="panel-title">Cost Breakdown — Click for Details</p>
        <table className="data-table">
          <thead><tr><th>Category</th><th>Total</th><th>% of Cost</th></tr></thead>
          <tbody>
            {distribution.map((c) => (
              <tr key={c.category} onClick={() => openCategoryDetail(c.category)} style={{ cursor: "pointer" }}>
                <td>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: CATEGORY_COLORS[c.category], marginRight: 8 }}></span>
                  {c.category}
                </td>
                <td className="mono">₹{c.amount.toLocaleString()}</td>
                <td><span className="badge" style={{ background: "rgba(245,185,66,0.15)", color: "var(--amber)" }}>{c.pct}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <p className="panel-title">Cost-Saving Recommendations</p>
        <ul className="rec-list">
          {recommendations.map((rec, i) => <li key={i} className="rec-item">{rec}</li>)}
        </ul>
      </div>

      {selectedCategory && (
        <div className="modal-overlay" onClick={() => setSelectedCategory(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedCategory(null)}>×</button>
            {categoryDetail ? (
              <>
                <h2 style={{ marginTop: 0, marginBottom: 4 }}>{categoryDetail.category}</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>{categoryDetail.pct_of_total}% of total operational cost</p>

                <div className="stat-cluster" style={{ marginBottom: 20 }}>
                  <div className="stat-cluster-item">
                    <span className="stat-cluster-label">Total Spent</span>
                    <span className="stat-cluster-value mono" style={{ color: CATEGORY_COLORS[selectedCategory] }}>₹{categoryDetail.total.toLocaleString()}</span>
                  </div>
                  <div className="stat-cluster-item">
                    <span className="stat-cluster-label">Avg. Monthly</span>
                    <span className="stat-cluster-value mono">₹{categoryDetail.avg_monthly.toLocaleString()}</span>
                  </div>
                  <div className="stat-cluster-item">
                    <span className="stat-cluster-label">Entries Logged</span>
                    <span className="stat-cluster-value mono">{categoryDetail.entry_count}</span>
                  </div>
                </div>

                <p className="panel-title">Highest / Lowest Month</p>
                <div className="stat-inline-row" style={{ marginBottom: 20 }}>
                  <div className="stat-inline-item">
                    <span className="stat-inline-label">Highest</span>
                    <span className="stat-inline-value mono" style={{ color: "var(--danger)" }}>₹{categoryDetail.highest_month.amount.toLocaleString()}</span>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{categoryDetail.highest_month.period}</div>
                  </div>
                  <div className="stat-inline-item">
                    <span className="stat-inline-label">Lowest</span>
                    <span className="stat-inline-value mono" style={{ color: "var(--cyan)" }}>₹{categoryDetail.lowest_month.amount.toLocaleString()}</span>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{categoryDetail.lowest_month.period}</div>
                  </div>
                </div>

                <p className="panel-title">Monthly Trend</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={categoryDetail.trend}>
                    <defs>
                      <linearGradient id="fillDetail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CATEGORY_COLORS[selectedCategory] || "#34D3C9"} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={CATEGORY_COLORS[selectedCategory] || "#34D3C9"} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" stroke="#8792A6" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8792A6" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }} formatter={(v) => `₹${v.toLocaleString()}`} />
                    <Area type="monotone" dataKey="amount" stroke={CATEGORY_COLORS[selectedCategory] || "#34D3C9"} strokeWidth={2} fill="url(#fillDetail)" />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            ) : <p style={{ color: "var(--text-muted)" }}>Loading...</p>}
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getEnergyAnalytics, getEnergyRecommendations } from "../../services/api";
import "../../App.css";

export default function EnergyDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    getEnergyAnalytics().then(setAnalytics);
    getEnergyRecommendations().then(setRecommendations);
  }, []);

  if (!analytics) return <p style={{ padding: 40, color: "#8792A6" }}>Loading energy data...</p>;

  const hourlyData = Object.entries(analytics.avg_by_hour).map(([hour, value]) => ({
    hour: `${hour}:00`,
    consumption: value
  }));

  const gaugePercent = Math.min(analytics.average_consumption / analytics.peak_consumption, 1);
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference * (1 - gaugePercent);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Energy Monitoring — Facility 01</h1>
      </div>

      <div className="stat-row">
        <div className="card gauge-card">
          <p className="section-title">Avg vs Peak Load</p>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="54" fill="none" stroke="#1F2A44" strokeWidth="12" />
            <circle
              cx="70" cy="70" r="54" fill="none"
              stroke="#F5B942" strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
            />
            <text x="70" y="65" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="22" fontWeight="700" fill="#E8ECF4">
              {analytics.average_consumption}
            </text>
            <text x="70" y="84" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#8792A6">
              of {analytics.peak_consumption} peak
            </text>
          </svg>
        </div>

        <div className="card">
          <p className="stat-label">Average Consumption</p>
          <span className="stat-value amber">{analytics.average_consumption}<span className="stat-unit">kWh</span></span>
        </div>
        <div className="card">
          <p className="stat-label">Peak Consumption</p>
          <span className="stat-value amber">{analytics.peak_consumption}<span className="stat-unit">kWh</span></span>
        </div>
        <div className="card">
          <p className="stat-label">Lowest Consumption</p>
          <span className="stat-value cyan">{analytics.lowest_consumption}<span className="stat-unit">kWh</span></span>
        </div>
      </div>

      <div className="card chart-card">
        <p className="section-title">Average Consumption by Hour</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={hourlyData}>
            <defs>
              <linearGradient id="fillAmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F5B942" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#F5B942" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="hour" stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} interval = {0}/>
            <YAxis stroke="#8792A6" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", borderRadius: 8, fontFamily: "Inter" }}
              labelStyle={{ color: "#8792A6" }}
            />
            <Area type="monotone" dataKey="consumption" stroke="#F5B942" strokeWidth={2} fill="url(#fillAmber)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <p className="section-title">Efficiency Recommendations</p>
        <ul className="rec-list">
          {recommendations.map((rec, i) => (
            <li key={i} className="rec-item">{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
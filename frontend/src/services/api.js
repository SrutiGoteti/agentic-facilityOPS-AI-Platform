import axios from "axios";

const API_BASE = "http://127.0.0.1:8000/api";

export const getEnergyAnalytics = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/energy/analytics`, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const getEnergyRecommendations = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/energy/recommendations`, {
    params: { facility_id: facilityId }
  });
  return response.data.recommendations;
};

export const getTemperatureCorrelation = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/energy/temperature-correlation`, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const getDayOfWeekBreakdown = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/energy/day-of-week`, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const getAnomalies = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/energy/anomalies`, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const getMaintenanceHealthScores = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/maintenance/health-scores`, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const getMaintenanceAlerts = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/maintenance/alerts`, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const getMaintenanceRecommendations = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/maintenance/recommendations`, {
    params: { facility_id: facilityId }
  });
  return response.data.recommendations;
};

export const getMonthlyTrend = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/energy/monthly-trend`, {
    params: { facility_id: facilityId }
  });
  return response.data.monthly_trend;
};

export const simulateEnergy = async (inputData, facilityId = 1) => {
  const response = await axios.post(`${API_BASE}/energy/simulate`, inputData, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const simulateMaintenance = async (inputData, facilityId = 1) => {
  const response = await axios.post(`${API_BASE}/maintenance/simulate`, inputData, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const getAssetDetail = async (assetId, facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/maintenance/asset/${assetId}`, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const getAnomalyDetail = async (timestamp, facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/energy/anomaly-detail`, {
    params: { timestamp, facility_id: facilityId }
  });
  return response.data;
};

export const addEnergyReading = async (data, facilityId = 1) => {
  const response = await axios.post(`${API_BASE}/energy/readings`, data, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const deleteEnergyReading = async (recordId, facilityId = 1) => {
  const response = await axios.delete(`${API_BASE}/energy/readings/${recordId}`, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const getRecentEnergyReadings = async (facilityId = 1, limit = 20) => {
  const response = await axios.get(`${API_BASE}/energy/readings/recent`, {
    params: { facility_id: facilityId, limit }
  });
  return response.data.readings;
};

export const addMaintenanceRecord = async (data, facilityId = 1) => {
  const response = await axios.post(`${API_BASE}/maintenance/records`, data, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const deleteMaintenanceRecord = async (recordId, facilityId = 1) => {
  const response = await axios.delete(`${API_BASE}/maintenance/records/${recordId}`, {
    params: { facility_id: facilityId }
  });
  return response.data;
};

export const getRecentMaintenanceRecords = async (facilityId = 1, limit = 20) => {
  const response = await axios.get(`${API_BASE}/maintenance/records/recent`, {
    params: { facility_id: facilityId, limit }
  });
  return response.data.records;
};

export const getAssetList = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/maintenance/assets`, {
    params: { facility_id: facilityId }
  });
  return response.data.assets;
};
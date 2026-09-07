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

export const getOccupancyAnalytics = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/occupancy/analytics`, { params: { facility_id: facilityId } });
  return response.data;
};

export const getOccupancyHeatmap = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/occupancy/heatmap`, { params: { facility_id: facilityId } });
  return response.data.rooms;
};

export const getRoomComparison = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/occupancy/room-comparison`, { params: { facility_id: facilityId } });
  return response.data.rooms;
};

export const getOvercrowdingEvents = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/occupancy/overcrowding`, { params: { facility_id: facilityId } });
  return response.data;
};

export const getOccupancyDayOfWeek = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/occupancy/day-of-week`, { params: { facility_id: facilityId } });
  return response.data;
};

export const getOccupancyRecommendations = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/occupancy/recommendations`, { params: { facility_id: facilityId } });
  return response.data.recommendations;
};

export const addOccupancyRecord = async (data, facilityId = 1) => {
  const response = await axios.post(`${API_BASE}/occupancy/records`, data, { params: { facility_id: facilityId } });
  return response.data;
};

export const deleteOccupancyRecord = async (recordId, facilityId = 1) => {
  const response = await axios.delete(`${API_BASE}/occupancy/records/${recordId}`, { params: { facility_id: facilityId } });
  return response.data;
};

export const getRecentOccupancyRecords = async (facilityId = 1, limit = 20) => {
  const response = await axios.get(`${API_BASE}/occupancy/records/recent`, { params: { facility_id: facilityId, limit } });
  return response.data.records;
};

export const getOccupancyRoomList = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/occupancy/rooms`, { params: { facility_id: facilityId } });
  return response.data.rooms;
};

export const getSecurityAnalytics = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/security/analytics`, { params: { facility_id: facilityId } });
  return response.data;
};
export const getSecurityEventsByType = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/security/events-by-type`, { params: { facility_id: facilityId } });
  return response.data.types;
};
export const getSecurityTimeline = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/security/timeline`, { params: { facility_id: facilityId } });
  return response.data.by_hour;
};
export const getAfterHoursEvents = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/security/after-hours`, { params: { facility_id: facilityId } });
  return response.data;
};
export const getSecurityRecommendations = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/security/recommendations`, { params: { facility_id: facilityId } });
  return response.data.recommendations;
};
export const addSecurityEvent = async (data, facilityId = 1) => {
  const response = await axios.post(`${API_BASE}/security/events`, data, { params: { facility_id: facilityId } });
  return response.data;
};
export const deleteSecurityEvent = async (eventId, facilityId = 1) => {
  const response = await axios.delete(`${API_BASE}/security/events/${eventId}`, { params: { facility_id: facilityId } });
  return response.data;
};
export const getRecentSecurityEvents = async (facilityId = 1, limit = 20) => {
  const response = await axios.get(`${API_BASE}/security/events/recent`, { params: { facility_id: facilityId, limit } });
  return response.data.events;
};

export const getEventsByLocation = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/security/events-by-location`, { params: { facility_id: facilityId } });
  return response.data.locations;
};

export const getCostAnalytics = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/cost/analytics`, { params: { facility_id: facilityId } });
  return response.data;
};
export const getCostDistribution = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/cost/distribution`, { params: { facility_id: facilityId } });
  return response.data.categories;
};
export const getCostTrend = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/cost/trend`, { params: { facility_id: facilityId } });
  return response.data.trend;
};
export const getCategoryTrend = async (category, facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/cost/category-trend/${category}`, { params: { facility_id: facilityId } });
  return response.data.trend;
};
export const getFacilityHealthScore = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/cost/health-score`, { params: { facility_id: facilityId } });
  return response.data;
};
export const getCostRecommendations = async (facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/cost/recommendations`, { params: { facility_id: facilityId } });
  return response.data.recommendations;
};
export const addCostEntry = async (data, facilityId = 1) => {
  const response = await axios.post(`${API_BASE}/cost/entries`, data, { params: { facility_id: facilityId } });
  return response.data;
};
export const deleteCostEntry = async (entryId, facilityId = 1) => {
  const response = await axios.delete(`${API_BASE}/cost/entries/${entryId}`, { params: { facility_id: facilityId } });
  return response.data;
};
export const getRecentCostEntries = async (facilityId = 1, limit = 20) => {
  const response = await axios.get(`${API_BASE}/cost/entries/recent`, { params: { facility_id: facilityId, limit } });
  return response.data.entries;
};

export const getCategoryDetail = async (category, facilityId = 1) => {
  const response = await axios.get(`${API_BASE}/cost/category-detail/${category}`, { params: { facility_id: facilityId } });
  return response.data;
};
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
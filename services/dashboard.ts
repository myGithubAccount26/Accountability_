import { API_BASE_URL, fetchWithTimeout, logApiRequest, logApiResponse } from './apiConfig';

export const fetchDashboardSummary = async () => {
  const url = `${API_BASE_URL}/analytics/dashboard-summary`;
  logApiRequest(url, 'GET');
  const response = await fetchWithTimeout(url, { method: 'GET' });
  logApiResponse(url, response.status, null);
  if (!response.ok) {
    throw new Error(`Dashboard summary failed (${response.status})`);
  }
  return response.json();
};

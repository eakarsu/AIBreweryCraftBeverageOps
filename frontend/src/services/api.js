import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) =>
  api.post('/auth/login', { email, password });

// Generic CRUD for all features
const featureEndpoints = {
  'brew-logs': '/brew-logs',
  'tanks': '/tanks',
  'raw-materials': '/raw-materials',
  'fermentation-logs': '/fermentation-logs',
  'packaging-runs': '/packaging-runs',
  'kegs': '/kegs',
  'pos-transactions': '/pos-transactions',
  'distributions': '/distributions',
  'lab-results': '/lab-results',
  'equipment': '/equipment',
  'events': '/events',
  'loyalty-members': '/loyalty-members',
  'financial-records': '/financial-records',
  'cip-schedules': '/cip-schedules',
  'vendors': '/vendors',
  'batches': '/batches',
};

export const getAll = (feature, params) =>
  api.get(featureEndpoints[feature] || `/${feature}`, { params });

export const getById = (feature, id) =>
  api.get(`${featureEndpoints[feature] || `/${feature}`}/${id}`);

export const create = (feature, data) =>
  api.post(featureEndpoints[feature] || `/${feature}`, data);

export const update = (feature, id, data) =>
  api.put(`${featureEndpoints[feature] || `/${feature}`}/${id}`, data);

export const remove = (feature, id) =>
  api.delete(`${featureEndpoints[feature] || `/${feature}`}/${id}`);

// AI Features (existing)
export const generateRecipeSuggestion = (data) => api.post('/ai/recipe-suggestion', data);
export const generateTastingNotes = (data) => api.post('/ai/tasting-notes', data);
export const generateFoodPairing = (data) => api.post('/ai/food-pairing', data);
export const generateDemandForecast = (data) => api.post('/ai/demand-forecast', data);
export const generateQualityAnalysis = (data) => api.post('/ai/quality-analysis', data);
export const generateLabelCopy = (data) => api.post('/ai/label-copy', data);
export const generateEventContent = (data) => api.post('/ai/event-content', data);

// AI Features (new — 8 advanced tools per audit)
export const generateBrewDayAssist = (data) => api.post('/ai/brew-day-assist', data);
export const generateYeastOptimizer = (data) => api.post('/ai/yeast-optimizer', data);
export const generateHopFreshness = (data) => api.post('/ai/hop-freshness', data);
export const generateWaterChemistry = (data) => api.post('/ai/water-chemistry', data);
export const generateCompetitionScore = (data) => api.post('/ai/competition-score', data);
export const generateCostOptimizer = (data) => api.post('/ai/cost-optimizer', data);
export const generateSeasonalMenuPlanner = (data) => api.post('/ai/seasonal-menu-planner', data);
export const generateCarbonFootprint = (data) => api.post('/ai/carbon-footprint', data);

export const fetchAIResults = (params) => api.get('/ai/results', { params });

// Batch-specific endpoints
export const updateBatchStatus = (id, status) => api.patch(`/batches/${id}/status`, { status });
export const downloadBrewSheet = (id) =>
  api.get(`/batches/${id}/brew-sheet/pdf`, { responseType: 'blob' });

// Alerts
export const fetchAlerts = () => api.get('/alerts');

// Webhooks
export const fetchWebhooks = () => api.get('/webhooks');
export const createWebhook = (data) => api.post('/webhooks', data);
export const deleteWebhook = (id) => api.delete(`/webhooks/${id}`);
export const testWebhook = (id) => api.post(`/webhooks/${id}/test`);

// Analytics
export const fetchDistributionAnalytics = () => api.get('/analytics/distribution');
export const fetchRevenueAnalytics = () => api.get('/analytics/revenue');
export const fetchQualityAnalytics = () => api.get('/analytics/quality');
export const fetchProductionAnalytics = () => api.get('/analytics/production');

// Loyalty points
export const awardPoints = (id, points, reason) =>
  api.post(`/loyalty-members/${id}/award-points`, { points, reason });
export const redeemPoints = (id, points, reason) =>
  api.post(`/loyalty-members/${id}/redeem-points`, { points, reason });

// Apply pass 5 extensions
export const fetchNotificationStatus = () => api.get('/ext/notifications/status');
export const sendNotification = (data) => api.post('/ext/notifications/send', data);
export const fetchNotifications = () => api.get('/ext/notifications');
export const fetchReport = (type, format = 'json') =>
  api.get(`/ext/reports/${type}?format=${format}`, format === 'csv' ? { responseType: 'blob' } : {});
export const dispatchWebhook = (event, payload) =>
  api.post('/ext/webhook-deliveries/dispatch', { event, payload });
export const fetchWebhookDeliveries = () => api.get('/ext/webhook-deliveries');
export const runAgent = (objective, context, topology) =>
  api.post('/ext/agents/run', { objective, context, topology });
export const fetchAgentRuns = () => api.get('/ext/agents/runs');
export const indexRagDoc = (data) => api.post('/ext/rag/index', data);
export const queryRag = (query, top_k) => api.post('/ext/rag/query', { query, top_k });
export const fetchTenants = () => api.get('/ext/tenants');
export const upsertTenant = (data) => api.post('/ext/tenants', data);
export const fetchTenantBySlug = (slug) => api.get(`/ext/tenants/${slug}`);

export default api;

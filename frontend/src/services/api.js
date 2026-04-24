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
};

export const getAll = (feature) =>
  api.get(featureEndpoints[feature] || `/${feature}`);

export const getById = (feature, id) =>
  api.get(`${featureEndpoints[feature] || `/${feature}`}/${id}`);

export const create = (feature, data) =>
  api.post(featureEndpoints[feature] || `/${feature}`, data);

export const update = (feature, id, data) =>
  api.put(`${featureEndpoints[feature] || `/${feature}`}/${id}`, data);

export const remove = (feature, id) =>
  api.delete(`${featureEndpoints[feature] || `/${feature}`}/${id}`);

// AI Features
export const generateRecipeSuggestion = (data) =>
  api.post('/ai/recipe-suggestion', data);

export const generateTastingNotes = (data) =>
  api.post('/ai/tasting-notes', data);

export const generateFoodPairing = (data) =>
  api.post('/ai/food-pairing', data);

export const generateDemandForecast = (data) =>
  api.post('/ai/demand-forecast', data);

export const generateQualityAnalysis = (data) =>
  api.post('/ai/quality-analysis', data);

export const generateLabelCopy = (data) =>
  api.post('/ai/label-copy', data);

export const generateEventContent = (data) =>
  api.post('/ai/event-content', data);

export default api;

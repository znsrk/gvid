// Central API base URL — points to Cloud Run in production, localhost in dev
const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
// Ensure URL ends with /api to prevent 404s if user forgot it in env vars
export const API_BASE = envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;

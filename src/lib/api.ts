// Central API base URL — points to Cloud Run in production, localhost in dev
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

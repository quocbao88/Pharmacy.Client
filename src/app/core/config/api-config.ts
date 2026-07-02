// Centralized API configuration for the Medicare Client SPA
// Dynamically reads the API URL from assets/config.json loaded at startup.
export const API_BASE_URL = (window as any).API_BASE_URL || 'http://localhost:1033';

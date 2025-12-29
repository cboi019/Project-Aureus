// src/utils/api.js
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://aureus-api-jniz.onrender.com' // Cleaned: No slash at the end
  : 'http://localhost:5000';
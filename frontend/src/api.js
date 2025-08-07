// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://mrkotomotiv.com/api'
  : 'http://localhost:5000/api';

export default API_BASE_URL;

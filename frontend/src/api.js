// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// API helper functions
export const api = {
  // Authentication
  login: (credentials) => 
    fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }),

  // Tahsilat operations
  getTahsilat: () =>
    fetch(`${API_BASE_URL}/tahsilat`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }),

  createTahsilat: (data) =>
    fetch(`${API_BASE_URL}/tahsilat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),

  updateTahsilat: (id, data) =>
    fetch(`${API_BASE_URL}/tahsilat/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),

  deleteTahsilat: (id) =>
    fetch(`${API_BASE_URL}/tahsilat/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    }),

  // Health check
  health: () =>
    fetch(`${API_BASE_URL}/health`, {
      method: 'GET'
    })
};

export default API_BASE_URL;

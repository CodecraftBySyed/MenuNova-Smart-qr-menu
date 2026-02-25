const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Use the /api prefix which netlify.toml redirects to your function
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:5000/api' 
  : '/api';

console.log(`🔧 API Configuration: ${isLocalhost ? 'LOCALHOST' : 'PRODUCTION'}`);

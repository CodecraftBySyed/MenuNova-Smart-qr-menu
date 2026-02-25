const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Production URL should be the relative /api path handled by redirects in netlify.toml
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:5000' 
  : '/api';

console.log(`🔧 API Configuration: ${isLocalhost ? 'LOCALHOST' : 'PRODUCTION (Netlify)'}`);
console.log(`📡 API Base URL: ${API_BASE_URL}`);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_BASE_URL, isLocalhost };
}

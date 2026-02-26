/**
 * API Configuration
 * Automatically detects environment and sets API base URL
 */

// Detect if running on localhost or production
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Set API base URL based on environment
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:5000'
  : 'https://menunova-smart-qr-menu-production.up.railway.app';

console.log(`🔧 API Configuration: ${isLocalhost ? 'LOCALHOST' : 'PRODUCTION'}`);
console.log(`📡 API Base URL: ${API_BASE_URL}`);

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_BASE_URL, isLocalhost };
}

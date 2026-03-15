// Optional config for deployments.
//
// If you host the static site on GitHub Pages but want ONLINE mode to work,
// deploy the Node server to Render and set this to your Render service URL.
// Example:
//   window.QUIZ_ONLINE_ORIGIN = "https://your-service.onrender.com";
//
// If empty, the quiz uses the current site origin (works on Render/local).
// Default is your Render service so GitHub Pages can use online mode.
window.QUIZ_ONLINE_ORIGIN = window.QUIZ_ONLINE_ORIGIN || "https://hanno-s-website.onrender.com";

// Scrims button destination on the home page.
// Change this to your own Scrims dashboard URL when needed.
window.SCRIMS_DASHBOARD_URL = window.SCRIMS_DASHBOARD_URL || "scrims.html";

// Backend API base for creating lobbies.
// Keep empty to use same origin (/api/scrims/*).
// Example: "https://your-cybrancee-domain.com"
window.SCRIMS_API_BASE = window.SCRIMS_API_BASE || "";

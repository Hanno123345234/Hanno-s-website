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

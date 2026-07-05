/* =========================================================
   APP-MAIN.js - Main entry point, module initialization
   
   This file orchestrates all modular components:
   - state.js: Global state, DOM refs, initialization
   - sidebar.js: Entity tree, search, grouping, tooltips
   - wiki.js: Wiki pages, metadata panels, details
   - diagram.js: Canvas rendering, layout, connectors
   - changelog.js: Version history, commits, mini diagrams
   - utils.js: Utilities, formatters, helpers
   ========================================================= */

// ── Module Import Order (in script tags) ─────────────────
// 1. utils.js           - Core utilities, no dependencies
// 2. state.js           - Global state, depends on utils
// 3. sidebar.js         - Sidebar logic, depends on utils, state
// 4. wiki.js            - Wiki rendering, depends on utils, state, sidebar
// 5. changelog.js       - Changelog, depends on utils, state, wiki
// 6. diagram.js         - Diagram rendering, depends on utils, state, sidebar
// 7. app-main.js        - Initialize app (this file)

// ── Application Initialization ────────────────────────────
(async () => {
  // Initialize app by loading versions and setting up UI
  await initializeApp();
})();

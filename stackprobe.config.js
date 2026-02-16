// stackprobe.config.js
// Place this file in your project root to customize stackprobe behavior

/** @type {import('stackprobe').StackProbeConfig} */
module.exports = {
  // Checks to skip entirely
  // Available: 'license', 'env', 'deps', 'engine', 'circular'
  ignore: [],

  // Run ONLY these checks (overrides ignore)
  // only: ['deps', 'env'],

  // When to exit with code 1 in CI
  // 'error' = only on failures (default)
  // 'warn'  = on warnings too
  failOn: "error",
};

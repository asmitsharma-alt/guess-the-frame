module.exports = {
  testMatch: ['tests/**/*.spec.js', 'e2e/**/*.spec.js'],
  timeout: 60000,
  workers: 1,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: [
    {
      command: 'node server/server.js',
      port: 4000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx http-server react-app/dist -p 8080 -s -c-1',
      port: 8080,
      reuseExistingServer: !process.env.CI,
    },
  ],
};
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3100",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" },
  },
  webServer: {
    command: "npm run build && CONTACT_RATE_LIMIT=100 npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 180000,
  },
});

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globalSetup: ["./vitest.global-setup.ts"],
    testTimeout: 15000,
    maxWorkers: 4,
  },
});

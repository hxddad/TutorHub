// vitest.config.ts
// Test runner configuration for TutorHub
// Sets up path aliases to match tsconfig so @/lib/... imports resolve correctly in tests
// Node environment is the default; component tests opt-in to jsdom via @vitest-environment jsdom

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  esbuild: {
    // Use the React 17+ automatic JSX transform so components don't need
    // `import React from "react"` — matches how Next.js compiles them
    jsx: "automatic",
  },
  test: {
    environment: "node",
    globals: false,
    // Run each test file in isolation to prevent mock bleed-over between suites
    isolate: true,
    // Global setup loads @testing-library/jest-dom matchers for component tests
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      // Mirror the @/* -> ./* alias from tsconfig.json so test imports match app imports
      "@": path.resolve(__dirname, "."),
    },
  },
});

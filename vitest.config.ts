import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    env: {
      JWT_SECRET: "tutorhub-test-jwt-secret-do-not-use-in-production-32+",
    },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text"],
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/node_modules/**",
        "app/api/**/*.tsx",
        "lib/prisma.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});

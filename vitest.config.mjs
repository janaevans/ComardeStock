import { defineConfig } from "vitest/config";
import path from "node:path";

const alias = {
  "@": path.resolve(import.meta.dirname, "src"),
  // `server-only` throws outside React Server Components; tests run in plain Node.
  "server-only": path.resolve(import.meta.dirname, "tests/helpers/empty.js"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", environment: "node", include: ["tests/unit/**/*.test.js"] },
      },
      {
        resolve: { alias },
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.js"],
          // Runs only when a disposable test database is configured.
          setupFiles: ["tests/helpers/db-setup.js"],
          fileParallelism: false,
        },
      },
    ],
  },
});

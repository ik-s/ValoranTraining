import { defineConfig } from "vitest/config";
import { sites } from "./build/sites-vite-plugin";

export default defineConfig({
  plugins: [sites()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});

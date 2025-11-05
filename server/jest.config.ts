import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  setupFiles: ["<rootDir>/jest.setup.ts"],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
};

export default config;

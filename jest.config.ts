import type { Config } from "jest";

const config: Config = {
	preset: "ts-jest/presets/default-esm",
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts"],
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
		"^prime-qa-api-common$": "<rootDir>/__mocks__/prime-qa-api-common.ts"
	},
	globals: {
		"ts-jest": {
			useESM: true,
			tsconfig: "tsconfig.json"
		}
	},
	testMatch: ["**/__tests__/**/*.spec.ts"],
	verbose: false
};

export default config;

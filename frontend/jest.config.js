const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  ...expoPreset,
  clearMocks: true,
  setupFiles: [...(expoPreset.setupFiles || []), "<rootDir>/test/jest.globals.js"],
  setupFilesAfterEnv: [...(expoPreset.setupFilesAfterEnv || []), "<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
  moduleNameMapper: {
    ...(expoPreset.moduleNameMapper || {}),
    "^expo/src/winter$": "<rootDir>/test/expoWinterStub.js",
    "^expo/src/winter/ImportMetaRegistry$": "<rootDir>/test/expoImportMetaRegistry.ts",
  },
};

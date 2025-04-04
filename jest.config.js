function defineJestConfig(config) {
  return {
    transform: {
      "^.+\\.[jt]s$": [
        "@swc/jest",
        {
          jsc: {
            parser: {
              syntax: "typescript",
              decorators: true,
            },
            transform: {
              useDefineForClassFields: false,
              legacyDecorator: true,
              decoratorMetadata: true,
            },
            target: "ES2021",
          },
          sourceMaps: "inline",
        },
      ],
    },
    modulePathIgnorePatterns: ["dist/"],
    testPathIgnorePatterns: ["dist/", "node_modules/"],
    transformIgnorePatterns: ["node_modules/"],
    testEnvironment: "node",
    moduleFileExtensions: ["js", "ts"],
    ...config,
  }
}

module.exports = defineJestConfig({
  moduleNameMapper: {
    "^@models": "<rootDir>/src/models",
    "^@services": "<rootDir>/src/services",
    "^@repositories": "<rootDir>/src/repositories",
    "^@types": "<rootDir>/src/types",
    "^@utils": "<rootDir>/src/utils",
  },
})

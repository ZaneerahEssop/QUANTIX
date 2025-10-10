module.exports = {
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(your-module-to-transform|another-module)/)',
  ],
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json", "node"],
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx}',
    '!<rootDir>/src/**/*.ignore.{js,jsx}'
  ],


  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!src/setupTests.js',
    "!src/client.js",   // ignore supabase client setup
    "!src/config.js",   // ignore config

  ],

  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '^react-markdown$': '<rootDir>/src/__mocks__/react_markdown.js',
  
  },

};


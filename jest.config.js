module.exports = {
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(your-module-to-transform|another-module)/)'
  ],
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json", "node"],
  testEnvironment: "jsdom",
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],


  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!src/setupTests.js',
  ],

  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  
  },

};


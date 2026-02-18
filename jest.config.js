module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.jest.test.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testPathIgnorePatterns: ['<rootDir>/.test-dist/']
};

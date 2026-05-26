/** @type {import('vitest').UserConfig} */
module.exports = {
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false,
    testTimeout: 30000,
  },
};

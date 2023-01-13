module.exports = {
  extensions: { ts: 'module' },
  nodeArguments: [
    '--loader=ts-node/esm',
    '--no-warnings',
    // '--experimental-specifier-resolution=node',
  ],
  ignoredByWatcher: ['{.nyc_output,dist,media}/**'],
  files: ['src/**/*.test.ts'],
}

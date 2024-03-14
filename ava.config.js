export default {
  environmentVariables: {
    TSIMP_DIAG: 'ignore',
  },
  extensions: { ts: 'module' },
  nodeArguments: ['--import=tsimp'],
  watchMode: {
    ignoreChanges: ['{coverage,dist,media,.tsimp}/**', '**/*.md'],
  },
  files: ['src/**/*.test.ts'],
}

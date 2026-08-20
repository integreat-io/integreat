import assert from 'node:assert/strict'

// Helpers for the memory tests in this folder. They need a forced garbage
// collection to measure retained memory, which `npm run test:memory` provides
// by passing `--expose-gc`.

// Collect twice around a tick of the event loop, so anything held only by a
// pending microtask is released before we measure.
export const collectGarbage = async () => {
  assert.ok(globalThis.gc, 'Run with --expose-gc, e.g. `npm run test:memory`')
  globalThis.gc()
  await new Promise((resolve) => setImmediate(resolve))
  globalThis.gc()
}

export const heapUsedAfterCollect = async () => {
  await collectGarbage()
  return process.memoryUsage().heapUsed
}

export const inKib = (bytes: number) => Math.round(bytes / 1024)

import { Queue, JobHandler } from '../../queue'

// Quick mock implementation of the Integreat queue interface supported by
// integreat.queue. Will push payload directly to the subscribed handler.
// Supports only one subscribe handler at the time.

export default (): Queue => {
  let handlerFn: JobHandler | null = null
  return {
    queue: {},

    namespace: 'test',

    async push(payload, _timestamp, id) {
      if (typeof handlerFn === 'function') {
        handlerFn(payload)
      }
      return id || 'queued1'
    },

    async subscribe(handler) {
      handlerFn = handler
      return 'handle1'
    },

    async unsubscribe(handle) {
      if (handle === 'handle1') {
        handlerFn = null
      }
    },

    clean: async () => undefined,

    flush: async () => [],

    close: async () => undefined,
  }
}

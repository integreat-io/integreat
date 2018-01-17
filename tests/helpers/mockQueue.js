// Quick mock implementation of the Integreat queue interface supported by
// integreat.queue. Will push payload directly to the subscribed handler.
// Supports only one subscribe handler at the time.

let handlerFn = null

module.exports = () => ({
  async push (payload, timestamp = null, id = null) {
    if (typeof handlerFn === 'function') {
      handlerFn(payload)
    }
    return id || 'queued1'
  },
  subscribe (handler) {
    handlerFn = handler
    return 'handle1'
  },
  unsubscribe (handle) {
    if (handle === 'handle1') {
      handlerFn = null
    }
  }
})

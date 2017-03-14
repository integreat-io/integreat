const EventEmitter = require('events')

class IntegreatSync {
  constructor () {
    this._emitter = new EventEmitter()
  }

  /**
   * Start sync server and return a promise.
   * Will start schedule queue and schedule all sources for sync.
   * @returns {Promise} Promise of server instance
   */
  start () {
    this._emitter.emit('start')
    return Promise.resolve()
  }

  /**
   * Stop sync server.
   * @returns {void}
   */
  stop () {
    this._emitter.emit('stop')
  }

  /**
   * Add listener to an event.
   * @param {string} eventName - Name of event to listen for
   * @param {function} listener - Function to call when event is emitted
   * @returns {Object} This IntegreatSync instance - for chaining
   */
  on (eventName, listener) {
    this._emitter.on(eventName, listener)
    return this
  }
}

module.exports = IntegreatSync

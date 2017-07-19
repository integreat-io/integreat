const Rx = require('rx')
const debug = require('debug')('great:queue')

// The timing handler. Returns a timer based on the given time argument
// (interval or Date object) and returns a payload when the time is reached.
const timePayload = (scheduler) => ([time, payload]) =>
  Rx.Observable.timer(time, scheduler).map(() => payload).tap(() => {
    debug('Timer reached for %o', payload)
  })

/**
 * Returns a queue based on RxJS.
 * Whenever a scheduled time is reached, the action is dispatch, and the
 * subscribing handlers are called.
 * @param {Object} options - Options object
 * @returns {Object} Queue object with push function
 */
function memory (options = {}) {
  const {altScheduler} = options
  const rxSubject = new Rx.Subject()
  const rxQueue = rxSubject.map(timePayload(altScheduler)).mergeAll()

  return {
    /**
     * Push an action to the queue. If a timestamp is included, the action is
     * scheduled for that time. If not, the action is «scheduled» for right now.
     * @param {Object} action - Action to schedule
     * @param {integer} timestamp - Timestamp to schedule action for
     * @returns {void}
     */
    async push (action, timestamp) {
      const time = (timestamp) ? new Date(timestamp) : new Date()
      debug('Queued for %s: %o', time, action)
      rxSubject.onNext([time, action])
      return true
    },

    /**
     * Subscribe to scheduler queue. Whenever a scheduled time is reached,
     * subscribed handlers are called with the respective action.
     * Return a subscription handle, used for unsubscribing.
     * @param {function} handler - Function to receive the action
     * @returns {object} Subscription handle
     */
    subscribe (handler) {
      debug('Subscribing %o', handler)
      return rxQueue.subscribe(handler)
    },

    /**
     * Unsubscribe from scheduler queue. Subscription is identified with the
     * handler from the `subscribe` method.
     * @param {object} handle - Subscription handle
     * @returns {void}
     */
    unsubscribe (handle) {
      if (handle) {
        handle.dispose()
        debug('Unsubscribed')
      }
    }
  }
}

module.exports = memory

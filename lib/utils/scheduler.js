const Rx = require('rx')
const debug = require('debug')('great:scheduler')

const timePayload = (scheduler) => ([time, payload]) =>
  Rx.Observable.timer(time, scheduler).map(() => payload).tap(() => {
    debug('Timer reached for %o', payload)
  })

/**
 * Scheduler class, implementing a schedule queue for payloads. Whenever a
 * scheduled time is reached, subscribing handlers are called with the
 * respective payload.
 * @class Scheduler
 */
class Scheduler {
  /**
   * Constructor.
   * @param {Object} altScheduler - Alternative scheduler to use for queue
   */
  constructor (altScheduler) {
    this._subject = new Rx.Subject()
    this._queue = this._subject.map(timePayload(altScheduler)).mergeAll()
  }

  /**
   * Schedule an event for a given time. The payload is added to the queue.
   * @param {integer} time - Time to scheduel payload for
   * @param {Object} payload - Payload to schedule
   * @returns {void}
   */
  schedule (time, payload) {
    if (time instanceof Date || typeof time === 'number') {
      debug('Scheduling for %s: %o', new Date(time), payload)
      this._subject.onNext([time, payload])
    }
  }

  /**
   * Subscribe to scheduler queue. Whenever a scheduled time is reached,
   * subscribed handlers are called with the respective payload.
   * Return a subscription handle, used for unsubscribing.
   * @param {function} nextHandler - Function to receive the payload
   * @returns {object} Subscription handle
   */
  subscribe (nextHandler) {
    debug('Subscribing %o', nextHandler)
    return this._queue.subscribe(nextHandler)
  }

  /**
   * Unsubscribe from scheduler queue. Subscription is identified with the
   * handler from the `subscribe` method.
   * The handle is a Disposable object in this implemention, but this could
   * change in future implementions, so don't assume anything.
   * @param {object} handler - Subscription handle
   * @returns {void}
   */
  unsubscribe (handle) {
    if (handle) {
      handle.dispose()
      debug('Unsubscribed')
    }
  }
}

module.exports = Scheduler

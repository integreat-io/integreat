const Rx = require('rx')

const timePayload = (scheduler) => ([time, payload]) => Rx.Observable.timer(time, scheduler).map(() => payload)

class Scheduler {
  constructor (altScheduler) {
    this._subject = new Rx.Subject()
    this._queue = this._subject.map(timePayload(altScheduler)).mergeAll()
  }

  schedule (time, payload) {
    if (time instanceof Date || typeof time === 'number') {
      this._subject.onNext([time, payload])
    }
  }

  subscribe (nextHandler) {
    return this._queue.subscribe(nextHandler)
  }

  unsubscribe (disposable) {
    if (disposable) {
      disposable.dispose()
    }
  }
}

module.exports = Scheduler

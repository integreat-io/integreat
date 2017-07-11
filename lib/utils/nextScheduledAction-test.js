import test from 'ava'
import sinon from 'sinon'
import later from 'later'

import nextScheduledAction from './nextScheduledAction'

test('should exist', (t) => {
  t.is(typeof nextScheduledAction, 'function')
})

test('should return the next action', (t) => {
  const schedule = {schedules: [{h: [2]}]}
  const action = {
    type: 'RUN',
    queue: false,
    schedule,
    payload: {worker: 'sync'}
  }
  const nextTime = later.schedule(schedule).next().getTime()
  const expected = {
    type: 'RUN',
    queue: nextTime,
    schedule,
    payload: {worker: 'sync'}
  }

  const ret = nextScheduledAction(action)

  t.deepEqual(ret, expected)
})

test('should always return next schedule', (t) => {
  const schedule = {schedules: [{h: [2]}]}
  const action = {
    type: 'RUN',
    queue: false,
    schedule,
    payload: {worker: 'sync'}
  }
  const nextTime = later.schedule(schedule).next().getTime()
  const nextNextTime = later.schedule(schedule).next(1, new Date(nextTime + 3600000)).getTime()
  const clock = sinon.useFakeTimers(nextTime)

  const ret = nextScheduledAction(action)

  t.is(ret.queue, nextNextTime)

  clock.restore()
})

test('should return null when no schedule', (t) => {
  const action = {
    type: 'RUN',
    queue: false,
    payload: {worker: 'sync'}
  }

  const ret = nextScheduledAction(action)

  t.is(ret, null)
})

test('should return null on invalid schedule', (t) => {
  const action = {
    type: 'RUN',
    queue: false,
    schedule: {schedules: [{x: [0]}]},
    payload: {worker: 'sync'}
  }

  const ret = nextScheduledAction(action)

  t.is(ret, null)
})

test('should return null when schedule is ended', (t) => {
  const action = {
    type: 'RUN',
    queue: false,
    schedule: {schedules: [{Y_b: [2015]}]},
    payload: {worker: 'sync'}
  }

  const ret = nextScheduledAction(action)

  t.is(ret, null)
})

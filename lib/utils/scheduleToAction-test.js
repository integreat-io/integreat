import test from 'ava'
import later from 'later'

import scheduleToAction from './scheduleToAction'

test('should exist', (t) => {
  t.is(typeof scheduleToAction, 'function')
})

test('should return null when no def', (t) => {
  const ret = scheduleToAction()

  t.is(ret, null)
})

test('should schedule action immediately', (t) => {
  const scheduleDef = Object.freeze({
    immediately: true,
    job: {
      worker: 'sync',
      params: {from: 'src1', to: 'src2'}
    }
  })
  const expected = {
    type: 'RUN',
    queue: true,
    schedule: null,
    payload: {
      worker: 'sync',
      params: {from: 'src1', to: 'src2'}
    }
  }

  const ret = scheduleToAction(scheduleDef)

  t.deepEqual(ret, expected)
})

test('should return null when not immediately', (t) => {
  const scheduleDef = {
    immediately: false,
    job: {}
  }

  const ret = scheduleToAction(scheduleDef)

  t.is(ret, null)
})

test('should schedule action at 2 am every night', (t) => {
  const startTime = later.schedule({schedules: [{h: [2]}]}).next().getTime()
  const scheduleDef = {
    schedule: [{h: [2]}],
    job: {}
  }
  const expected = {
    type: 'RUN',
    queue: startTime,
    schedule: {schedules: [{h: [2]}]},
    payload: {}
  }

  const ret = scheduleToAction(scheduleDef)

  t.deepEqual(ret, expected)
})

test('should schedule and run immediately', (t) => {
  const scheduleDef = {
    schedule: [{h: [2]}],
    immediately: true,
    job: {}
  }

  const ret = scheduleToAction(scheduleDef)

  t.true(ret.queue)
  t.deepEqual(ret.schedule, {schedules: [{h: [2]}]})
})

test('should resolve from simple schedule', (t) => {
  const scheduleDef = {
    schedule: {h: [2]},
    job: {}
  }
  const expected = {schedules: [{h: [2]}]}

  const ret = scheduleToAction(scheduleDef)

  t.deepEqual(ret.schedule, expected)
})

test('should accept complete schedule', (t) => {
  const scheduleDef = {
    schedule: {
      schedules: [{h: [2]}],
      exceptions: [],
      error: -1
    },
    job: {}
  }
  const expected = {schedules: [{h: [2]}], exceptions: []}

  const ret = scheduleToAction(scheduleDef)

  t.truthy(ret)
  t.deepEqual(ret.schedule, expected)
})

test('should resolve from text expression', (t) => {
  const scheduleDef = {
    schedule: 'at 2:00 am',
    job: {}
  }
  const expected = [{t: [7200]}]

  const ret = scheduleToAction(scheduleDef)

  t.deepEqual(ret.schedule.schedules, expected)
  t.deepEqual(ret.schedule.exceptions, [])
  t.is(ret.schedule.error, undefined)
})

test('should return null for invalid schedule', (t) => {
  const scheduleDef = {
    schedule: [{x: [2]}],
    job: {}
  }

  const ret = scheduleToAction(scheduleDef)

  t.is(ret, null)
})

test('should return null for invalid text schedule', (t) => {
  const scheduleDef = {
    schedule: 'at 2 am',
    job: {}
  }

  const ret = scheduleToAction(scheduleDef)

  t.is(ret, null)
})

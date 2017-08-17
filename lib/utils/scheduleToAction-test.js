import test from 'ava'

import scheduleToAction from './scheduleToAction'

test('should exist', (t) => {
  t.is(typeof scheduleToAction, 'function')
})

test('should return null when no def', (t) => {
  const ret = scheduleToAction()

  t.is(ret, null)
})

test('should return action', (t) => {
  const scheduleDef = Object.freeze({
    job: {
      worker: 'sync',
      params: {from: 'src1', to: 'src2'}
    }
  })
  const expected = {
    id: null,
    type: 'RUN',
    schedule: null,
    payload: {
      worker: 'sync',
      params: {from: 'src1', to: 'src2'}
    }
  }

  const ret = scheduleToAction(scheduleDef)

  t.deepEqual(ret, expected)
})

test('should set action id', (t) => {
  const scheduleDef = Object.freeze({
    id: 'job1',
    job: {
      worker: 'sync',
      params: {}
    }
  })

  const ret = scheduleToAction(scheduleDef)

  t.is(ret.id, 'job1')
})

test('should schedule action at 2 am every night', (t) => {
  const scheduleDef = {
    schedule: [{h: [2]}],
    job: {}
  }
  const expected = {schedules: [{h: [2]}]}

  const ret = scheduleToAction(scheduleDef)

  t.deepEqual(ret.schedule, expected)
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

test('should throw on invalid text schedule', (t) => {
  const scheduleDef = {
    schedule: 'at 2 am',
    job: {}
  }

  t.throws(() => {
    scheduleToAction(scheduleDef)
  })
})

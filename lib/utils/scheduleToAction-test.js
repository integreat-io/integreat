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

test('should return action', (t) => {
  const scheduleDef = Object.freeze({
    job: {
      worker: 'sync',
      params: {from: 'src1', to: 'src2'}
    }
  })
  const expected = {
    type: 'RUN',
    payload: {
      worker: 'sync',
      params: {from: 'src1', to: 'src2'}
    },
    meta: {
      id: null,
      schedule: null,
      queue: true
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

  t.truthy(ret.meta)
  t.is(ret.meta.id, 'job1')
})

test('should schedule action at 2 am every night', (t) => {
  const scheduleDef = {
    schedule: [{h: [2]}],
    job: {}
  }
  const expected = {schedules: [{h: [2]}]}

  const ret = scheduleToAction(scheduleDef)

  t.truthy(ret.meta)
  t.deepEqual(ret.meta.schedule, expected)
})

test('should set queue timestamp to time of next execution', (t) => {
  const scheduleDef = {
    schedule: [{h: [2]}],
    job: {}
  }
  const expected = later.schedule({schedules: [{h: [2]}]}).next().getTime()

  const ret = scheduleToAction(scheduleDef)

  t.truthy(ret.meta)
  t.is(ret.meta.queue, expected)
})

test('should resolve from simple schedule', (t) => {
  const scheduleDef = {
    schedule: {h: [2]},
    job: {}
  }
  const expected = {schedules: [{h: [2]}]}

  const ret = scheduleToAction(scheduleDef)

  t.deepEqual(ret.meta.schedule, expected)
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

  t.deepEqual(ret.meta.schedule, expected)
})

test('should resolve from text expression', (t) => {
  const scheduleDef = {
    schedule: 'at 2:00 am',
    job: {}
  }
  const expected = [{t: [7200]}]

  const ret = scheduleToAction(scheduleDef)

  const {schedule} = ret.meta
  t.deepEqual(schedule.schedules, expected)
  t.deepEqual(schedule.exceptions, [])
  t.is(schedule.error, undefined)
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

test('should throw on invalid schedule definition', (t) => {
  const scheduleDef = {
    schedule: {x: [3]},
    job: {}
  }

  t.throws(() => {
    scheduleToAction(scheduleDef)
  })
})

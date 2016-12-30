import test from 'ava'
import sinon from 'sinon'

import scheduleSource from './scheduleSource'

// Helpers

function setupScheduler () {
  const schedule = sinon.spy()
  const scheduler = {schedule}
  return {scheduler, schedule}
}

// Tests

test('should exist', (t) => {
  t.is(typeof scheduleSource, 'function')
})

test('should schedule source', (t) => {
  const {scheduler, schedule} = setupScheduler()
  const sourceDef = {
    id: 'source1',
    sync: {
      schedule: 3600
    }
  }
  const before = Date.now()

  scheduleSource(scheduler, sourceDef)

  const after = Date.now()
  t.true(schedule.calledOnce)
  const nextSync = schedule.args[0][0]
  const payload = schedule.args[0][1]
  t.true(nextSync >= before)
  t.true(nextSync <= after)
  t.is(payload, sourceDef)
})

test('should schedule source after last sync', (t) => {
  const {scheduler, schedule} = setupScheduler()
  const sourceDef = {sync: {schedule: 3600}}
  const lastSync = Date.now() - 15000
  const expected = lastSync + 3600000

  scheduleSource(scheduler, sourceDef, lastSync)

  const nextSync = schedule.args[0][0]
  t.is(nextSync, expected)
})

test('should do nothing when no source definition', (t) => {
  const {scheduler, schedule} = setupScheduler()

  scheduleSource(scheduler)

  t.false(schedule.calledOnce)
})

test('should do nothing when no sync definition', (t) => {
  const {scheduler, schedule} = setupScheduler()
  const sourceDef = {}

  scheduleSource(scheduler, sourceDef)

  t.false(schedule.calledOnce)
})

test('should do nothing when no schedule is defined', (t) => {
  const {scheduler, schedule} = setupScheduler()
  const sourceDef = {sync: {}}

  scheduleSource(scheduler, sourceDef)

  t.false(schedule.calledOnce)
})

test('should do nothing when no scheduler', (t) => {
  t.notThrows(() => {
    scheduleSource(null, {})
  })
})

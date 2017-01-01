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
  const sourceDef = Object.freeze({
    id: 'source1',
    sync: {schedule: 3600}
  })
  const before = Date.now()

  scheduleSource(scheduler, sourceDef)

  const after = Date.now()
  t.true(schedule.calledOnce)
  const nextSyncDate = schedule.args[0][0]
  t.true(nextSyncDate instanceof Date)
  const nextSync = nextSyncDate.getTime()
  t.true(nextSync >= before)
  t.true(nextSync <= after)
  const payload = schedule.args[0][1]
  t.is(payload.id, 'source1')
  t.is(payload.sync, sourceDef.sync)
  t.is(payload.nextSync, nextSync)
})

test('should schedule source after last sync', (t) => {
  const {scheduler, schedule} = setupScheduler()
  const lastSync = Date.now() - 15000
  const expected = lastSync + 3600000
  const sourceDef = {sync: {schedule: 3600}, nextSync: lastSync}

  scheduleSource(scheduler, sourceDef)

  const nextSyncDate = schedule.args[0][0]
  t.is(nextSyncDate.getTime(), expected)
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

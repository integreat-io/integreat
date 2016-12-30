import test from 'ava'

import nextSyncTime from './nextSyncTime'

test('should exist', (t) => {
  t.is(typeof nextSyncTime, 'function')
})

test('should return now when never synced', (t) => {
  const syncDef = {schedule: 3600}
  const before = Date.now()

  const time = nextSyncTime(syncDef)

  const after = Date.now()
  t.true(time >= before)
  t.true(time <= after)
})

test('should return one hour after last sync time', (t) => {
  const syncDef = {schedule: 3600}
  const lastSync = Date.now()
  const expected = lastSync + (3600000)

  const time = nextSyncTime(syncDef, lastSync)

  t.is(time, expected)
})

test('should return now when more than one period since last sync', (t) => {
  const syncDef = {schedule: 3600}
  const lastSync = Date.now() - 7200000
  const before = Date.now()

  const time = nextSyncTime(syncDef, lastSync)

  const after = Date.now()
  t.true(time >= before)
  t.true(time <= after)
})

test('should return null when no sync schedule', (t) => {
  const syncDef = {}

  const time = nextSyncTime(syncDef)

  t.is(time, null)
})

test('should return null when no sync def', (t) => {
  const time = nextSyncTime()

  t.is(time, null)
})

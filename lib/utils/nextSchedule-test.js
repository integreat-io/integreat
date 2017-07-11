import test from 'ava'
import sinon from 'sinon'

import nextSchedule from './nextSchedule'

test('should exist', (t) => {
  t.is(typeof nextSchedule, 'function')
})

test('should return the next time', (t) => {
  const schedule = {schedules: [{h: [2]}]}
  const now = new Date('2017-07-10T17:03:46.018Z').getTime()
  const expected = new Date('2017-07-11T02:00:00.000Z').getTime()
  const clock = sinon.useFakeTimers(now)

  const ret = nextSchedule(schedule)

  t.truthy(ret)
  t.is(ret.getTime(), expected)

  clock.restore()
})

test('should return now as next time', (t) => {
  const schedule = {schedules: [{h: [2]}]}
  const now = new Date('2017-07-10T02:00:00.000Z').getTime()
  const expected = new Date('2017-07-11T02:00:00.000Z').getTime()
  const clock = sinon.useFakeTimers(now)

  const ret = nextSchedule(schedule)

  t.is(ret.getTime(), expected)

  clock.restore()
})

test('should return now as next time if allowed', (t) => {
  const schedule = {schedules: [{h: [2]}]}
  const now = new Date('2017-07-10T02:00:00.000Z').getTime()
  const clock = sinon.useFakeTimers(now)

  const ret = nextSchedule(schedule, true)

  t.is(ret.getTime(), now)

  clock.restore()
})

test('should return null when no schedule', (t) => {
  const ret = nextSchedule()

  t.is(ret, null)
})

test('should return null on invalid schedule', (t) => {
  const schedule = {schedules: [{x: [0]}]}

  const ret = nextSchedule(schedule)

  t.is(ret, null)
})

test('should return null when schedule is ended', (t) => {
  const schedule = {schedules: [{Y_b: [2015]}]}

  const ret = nextSchedule(schedule)

  t.is(ret, null)
})

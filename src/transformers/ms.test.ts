import test from 'ava'

import ms from './ms'

// Setup

const state = {
  rev: false,
  onlyMappedValues: false,
  context: [],
  value: {},
}
const stateRev = {
  rev: true,
  onlyMappedValues: false,
  context: [],
  value: {},
}

// Tests -- from service

test('should convert milliseconds to Date', (t) => {
  const value = 1642085926975
  const expected = new Date('2022-01-13T14:58:46.975Z')

  const ret = ms()(value, state)

  t.deepEqual(ret, expected)
})

test('should return Date as Date', (t) => {
  const value = new Date('2022-01-13T14:58:46.975Z')
  const expected = new Date('2022-01-13T14:58:46.975Z')

  const ret = ms()(value, state)

  t.deepEqual(ret, expected)
})

test('should return undefined when not ms or Date', (t) => {
  t.is(ms()('Hello', state), undefined)
  t.is(ms()({}, state), undefined)
  t.is(ms()(true, state), undefined)
  t.is(ms()(null, state), undefined)
  t.is(ms()(undefined, state), undefined)
})

// Tests -- to service

test('should convert Date to milliseconds', (t) => {
  const value = new Date('2022-01-13T14:58:46.975Z')
  const expected = 1642085926975

  const ret = ms()(value, stateRev)

  t.deepEqual(ret, expected)
})

test('should convert date string to milliseconds', (t) => {
  const value = '2022-01-13T14:58:46.975Z'
  const expected = 1642085926975

  const ret = ms()(value, stateRev)

  t.deepEqual(ret, expected)
})

test('should return milliseconds as milliseconds', (t) => {
  const value = 1642085926975
  const expected = 1642085926975

  const ret = ms()(value, stateRev)

  t.deepEqual(ret, expected)
})

test('should return undefined when not ms or Date - rev', (t) => {
  t.is(ms()('Hello', state), undefined)
  t.is(ms()({}, state), undefined)
  t.is(ms()(true, state), undefined)
  t.is(ms()(null, state), undefined)
  t.is(ms()(undefined, state), undefined)
})

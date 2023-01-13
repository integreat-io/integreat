import test from 'ava'

import formatDate from './formatDate.js'

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

test('should convert date string to Date', (t) => {
  const value = '2021-01-03T18:43:11Z'
  const expected = new Date('2021-01-03T18:43:11Z')

  const ret = formatDate({})(value, state)

  t.deepEqual(ret, expected)
})

test('should convert date string to Date with format string', (t) => {
  const value = '18|43|11 January 3 2021'
  const expected = new Date('2021-01-03T18:43:11+01:00')

  const ret = formatDate({ format: 'hh|mm|ss LLLL d yyyy' })(value, state)

  t.deepEqual(ret, expected)
})

test('should convert milliseconds to Date', (t) => {
  const value = 1609699391000
  const expected = new Date('2021-01-03T18:43:11Z')

  const ret = formatDate({})(value, state)

  t.deepEqual(ret, expected)
})

test('should return Date', (t) => {
  const value = new Date('2021-01-03T18:43:11Z')
  const expected = new Date('2021-01-03T18:43:11Z')

  const ret = formatDate({})(value, state)

  t.deepEqual(ret, expected)
})

test('should return undefined when not a date', (t) => {
  t.is(formatDate({})('What?', state), undefined)
  t.is(formatDate({})(true, state), undefined)
  t.is(formatDate({})({}, state), undefined)
  t.is(formatDate({})(undefined, state), undefined)
})

test('should return null for null from service', (t) => {
  t.is(formatDate({})(null, state), null)
})

// Tests -- to service

test('should format Date', (t) => {
  const value = new Date('2021-01-03T18:43:11Z')
  const expected = '03.01.2021'

  const ret = formatDate({ format: 'dd.MM.yyyy' })(value, stateRev)

  t.is(ret, expected)
})

test('should format date string', (t) => {
  const value = '2021-01-03T18:43:11Z'
  const expected = '03.01.2021'

  const ret = formatDate({ format: 'dd.MM.yyyy' })(value, stateRev)

  t.is(ret, expected)
})

test('should format date in ms', (t) => {
  const value = 1609699391000
  const expected = '03.01.2021'

  const ret = formatDate({ format: 'dd.MM.yyyy' })(value, stateRev)

  t.is(ret, expected)
})

test('should use iso format as default', (t) => {
  const value = new Date('2021-01-03T18:43:11Z')
  const expected = '2021-01-03T18:43:11.000Z'

  const ret = formatDate({})(value, stateRev)

  t.is(ret, expected)
})

test('should return undefined when no date', (t) => {
  t.is(formatDate({ format: 'DD.MM.YYYY' })('wHaT?', stateRev), undefined)
  t.is(formatDate({ format: 'DD.MM.YYYY' })(false, stateRev), undefined)
  t.is(formatDate({ format: 'DD.MM.YYYY' })({}, stateRev), undefined)
  t.is(formatDate({ format: 'DD.MM.YYYY' })(undefined, stateRev), undefined)
})

test('should return null for null to service', (t) => {
  t.is(formatDate({})(null, stateRev), null)
})

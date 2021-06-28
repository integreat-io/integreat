import test from 'ava'

import formatDate from './formatDate'

// Setup

const context = {
  rev: false,
  onlyMappedValues: false,
}
const contextRev = {
  rev: true,
  onlyMappedValues: false,
}

// Tests -- from service

test('should convert date string to Date', (t) => {
  const value = '2021-01-03T18:43:11Z'
  const expected = new Date('2021-01-03T18:43:11Z')

  const ret = formatDate({})(value, context)

  t.deepEqual(ret, expected)
})

test('should convert date string to Date with format string', (t) => {
  const value = '18|43|11 January 3 2021'
  const expected = new Date('2021-01-03T18:43:11+01:00')

  const ret = formatDate({ format: 'hh|mm|ss LLLL d yyyy' })(value, context)

  t.deepEqual(ret, expected)
})

test('should convert milliseconds to Date', (t) => {
  const value = 1609699391000
  const expected = new Date('2021-01-03T18:43:11Z')

  const ret = formatDate({})(value, context)

  t.deepEqual(ret, expected)
})

test('should return Date', (t) => {
  const value = new Date('2021-01-03T18:43:11Z')
  const expected = new Date('2021-01-03T18:43:11Z')

  const ret = formatDate({})(value, context)

  t.deepEqual(ret, expected)
})

test('should return undefined when not a date', (t) => {
  t.is(formatDate({})('What?', context), undefined)
  t.is(formatDate({})(true, context), undefined)
  t.is(formatDate({})({}, context), undefined)
  t.is(formatDate({})(undefined, context), undefined)
})

test('should return null for null from service', (t) => {
  t.is(formatDate({})(null, context), null)
})

// Tests -- to service

test('should format Date', (t) => {
  const value = new Date('2021-01-03T18:43:11Z')
  const expected = '03.01.2021'

  const ret = formatDate({ format: 'dd.MM.yyyy' })(value, contextRev)

  t.is(ret, expected)
})

test('should format date string', (t) => {
  const value = '2021-01-03T18:43:11Z'
  const expected = '03.01.2021'

  const ret = formatDate({ format: 'dd.MM.yyyy' })(value, contextRev)

  t.is(ret, expected)
})

test('should format date in ms', (t) => {
  const value = 1609699391000
  const expected = '03.01.2021'

  const ret = formatDate({ format: 'dd.MM.yyyy' })(value, contextRev)

  t.is(ret, expected)
})

test('should use iso format as default', (t) => {
  const value = new Date('2021-01-03T18:43:11Z')
  const expected = '2021-01-03T18:43:11.000Z'

  const ret = formatDate({})(value, contextRev)

  t.is(ret, expected)
})

test('should return undefined when no date', (t) => {
  t.is(formatDate({ format: 'DD.MM.YYYY' })('wHaT?', contextRev), undefined)
  t.is(formatDate({ format: 'DD.MM.YYYY' })(false, contextRev), undefined)
  t.is(formatDate({ format: 'DD.MM.YYYY' })({}, contextRev), undefined)
  t.is(formatDate({ format: 'DD.MM.YYYY' })(undefined, contextRev), undefined)
})

test('should return null for null to service', (t) => {
  t.is(formatDate({})(null, contextRev), null)
})

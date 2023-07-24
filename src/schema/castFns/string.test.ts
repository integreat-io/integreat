import test from 'ava'

import stringFn from './string.js'

// Tests

test('should transform values to string', (t) => {
  t.is(stringFn('A string'), 'A string')
  t.is(stringFn(12345), '12345')
  t.is(stringFn(12.345), '12.345')
  t.is(stringFn(true), 'true')
  t.is(stringFn(false), 'false')
})

test('should transform dates to iso string', (t) => {
  t.is(
    stringFn(new Date('2019-05-22T13:43:11.345Z')),
    '2019-05-22T13:43:11.345Z'
  )
  t.is(
    stringFn(new Date('2019-05-22T15:43:11.345+02:00')),
    '2019-05-22T13:43:11.345Z'
  )
})

test('should transform objects to undefined', (t) => {
  t.is(stringFn({}), undefined)
  t.is(stringFn({ id: '12345', title: 'Wrong' }), undefined)
})

test('should not touch null and undefined', (t) => {
  t.is(stringFn(null), null)
  t.is(stringFn(undefined), undefined)
})

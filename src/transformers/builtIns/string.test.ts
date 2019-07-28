import test from 'ava'

import stringFn from './string'

// Setup

const operands = {}

// Tests

test('should transform values to string', t => {
  t.is(stringFn(operands)('A string'), 'A string')
  t.is(stringFn(operands)(12345), '12345')
  t.is(stringFn(operands)(12.345), '12.345')
  t.is(stringFn(operands)(true), 'true')
  t.is(stringFn(operands)(false), 'false')
})

test('should transform dates to iso string', t => {
  t.is(stringFn(operands)(new Date('2019-05-22T13:43:11.345Z')), '2019-05-22T13:43:11.345Z')
  t.is(stringFn(operands)(new Date('2019-05-22T15:43:11.345+02:00')), '2019-05-22T13:43:11.345Z')
})

test('should transform objects to undefined', t => {
  t.is(stringFn(operands)({}), undefined)
  t.is(stringFn(operands)({ id: '12345', title: 'Wrong' }), undefined)
})

test('should not touch null and undefined', t => {
  t.is(stringFn(operands)(null), null)
  t.is(stringFn(operands)(undefined), undefined)
})

test('should iterate arrays', t => {
  const value = [
    'A string',
    12345,
    true,
    null,
    undefined,
    new Date('2019-05-22T13:43:11.345Z'),
    {}
  ]
  const expected = [
    'A string',
    '12345',
    'true',
    null,
    undefined,
    '2019-05-22T13:43:11.345Z',
    undefined
  ]

  const ret = stringFn(operands)(value)

  t.deepEqual(ret, expected)
})

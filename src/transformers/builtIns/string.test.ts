import test from 'ava'

import stringFn from './string'

// Setup

const operands = {}
const options = {}
const context = { rev: false, onlyMappedValues: false }

// Tests

test('should transform values to string', (t) => {
  t.is(stringFn(operands, options)('A string', context), 'A string')
  t.is(stringFn(operands, options)(12345, context), '12345')
  t.is(stringFn(operands, options)(12.345, context), '12.345')
  t.is(stringFn(operands, options)(true, context), 'true')
  t.is(stringFn(operands, options)(false, context), 'false')
})

test('should transform dates to iso string', (t) => {
  t.is(
    stringFn(operands, options)(new Date('2019-05-22T13:43:11.345Z'), context),
    '2019-05-22T13:43:11.345Z'
  )
  t.is(
    stringFn(operands, options)(
      new Date('2019-05-22T15:43:11.345+02:00'),
      context
    ),
    '2019-05-22T13:43:11.345Z'
  )
})

test('should transform objects to undefined', (t) => {
  t.is(stringFn(operands, options)({}, context), undefined)
  t.is(
    stringFn(operands, options)({ id: '12345', title: 'Wrong' }, context),
    undefined
  )
})

test('should not touch null and undefined', (t) => {
  t.is(stringFn(operands, options)(null, context), null)
  t.is(stringFn(operands, options)(undefined, context), undefined)
})

test('should iterate arrays', (t) => {
  const value = [
    'A string',
    12345,
    true,
    null,
    undefined,
    new Date('2019-05-22T13:43:11.345Z'),
    {},
  ]
  const expected = [
    'A string',
    '12345',
    'true',
    null,
    undefined,
    '2019-05-22T13:43:11.345Z',
    undefined,
  ]

  const ret = stringFn(operands, options)(value, context)

  t.deepEqual(ret, expected)
})

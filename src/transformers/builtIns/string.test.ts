import test from 'ava'

import stringFn from './string'

// Setup

const operands = {}
const options = {}
const state = {
  rev: false,
  onlyMappedValues: false,
  root: {},
  context: {},
  value: {},
}

// Tests

test('should transform values to string', (t) => {
  t.is(stringFn(operands, options)('A string', state), 'A string')
  t.is(stringFn(operands, options)(12345, state), '12345')
  t.is(stringFn(operands, options)(12.345, state), '12.345')
  t.is(stringFn(operands, options)(true, state), 'true')
  t.is(stringFn(operands, options)(false, state), 'false')
})

test('should transform dates to iso string', (t) => {
  t.is(
    stringFn(operands, options)(new Date('2019-05-22T13:43:11.345Z'), state),
    '2019-05-22T13:43:11.345Z'
  )
  t.is(
    stringFn(operands, options)(
      new Date('2019-05-22T15:43:11.345+02:00'),
      state
    ),
    '2019-05-22T13:43:11.345Z'
  )
})

test('should transform objects to undefined', (t) => {
  t.is(stringFn(operands, options)({}, state), undefined)
  t.is(
    stringFn(operands, options)({ id: '12345', title: 'Wrong' }, state),
    undefined
  )
})

test('should not touch null and undefined', (t) => {
  t.is(stringFn(operands, options)(null, state), null)
  t.is(stringFn(operands, options)(undefined, state), undefined)
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

  const ret = stringFn(operands, options)(value, state)

  t.deepEqual(ret, expected)
})

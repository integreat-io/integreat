import test from 'ava'
import type { Reference } from '../../types.js'

import reference from './reference.js'

// Setup

const operands = { type: 'entry' }
const options = {}
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

const createRel = (
  id: string | number | null,
  props: Partial<Reference> = { $ref: 'entry' }
) => ({
  id: typeof id === 'number' ? String(id) : id,
  ...props,
})

// Tests

test('should return relationship object from value', (t) => {
  t.deepEqual(reference(operands, options)('ent1', state), createRel('ent1'))
  t.deepEqual(
    reference(operands, options)({ id: 'ent1' }, state),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', $ref: 'entry' }, state),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands, options)({ id: 12345, $ref: 'entry' }, state),
    createRel('12345')
  )
  t.deepEqual(
    reference(operands, options)(new Date('2019-05-22T13:43:11.345Z'), state),
    createRel('1558532591345')
  )
})

test('should return array of relationship objects from value', (t) => {
  const expected = [createRel('ent1'), createRel('ent2')]

  t.deepEqual(reference(operands, options)(['ent1', 'ent2'], state), expected)
  t.deepEqual(
    reference(operands, options)([{ id: 'ent1' }, { id: 'ent2' }], state),
    expected
  )
  t.deepEqual(
    reference(operands, options)(
      [
        { id: 'ent1', $ref: 'entry' },
        { id: 'ent2', $ref: 'entry' },
      ],
      state
    ),
    expected
  )
  t.deepEqual(
    reference(operands, options)(
      [{ id: 'ent1', $ref: 'entry' }, { id: 'ent2' }],
      state
    ),
    expected
  )
})

test('should keep isNew and isDeleted when true', (t) => {
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isNew: true }, state),
    createRel('ent1', { isNew: true, $ref: 'entry' })
  )
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isDeleted: true }, state),
    createRel('ent1', { isDeleted: true, $ref: 'entry' })
  )
  t.deepEqual(
    reference(operands, options)(
      { id: 'ent1', isNew: true, isDeleted: true },
      state
    ),
    createRel('ent1', { isNew: true, isDeleted: true, $ref: 'entry' })
  )
})

test('should not keep isNew and isDeleted when false', (t) => {
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isNew: false }, state),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isDeleted: false }, state),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands, options)(
      { id: 'ent1', isNew: false, isDeleted: true },
      state
    ),
    createRel('ent1', { isDeleted: true, $ref: 'entry' })
  )
})

test('should return relationship object in reverse', (t) => {
  t.deepEqual(reference(operands, options)('ent1', stateRev), { id: 'ent1' })
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', $ref: 'entry' }, stateRev),
    { id: 'ent1' }
  )
  t.deepEqual(reference(operands, options)({ id: 'ent1' }, stateRev), {
    id: 'ent1',
  })
})

test('should return array of relationship objects in reverse', (t) => {
  const expected = [{ id: 'ent1' }, { id: 'ent2' }]

  t.deepEqual(
    reference(operands, options)(['ent1', 'ent2'], stateRev),
    expected
  )
  t.deepEqual(
    reference(operands, options)([{ id: 'ent1' }, { id: 'ent2' }], stateRev),
    expected
  )
  t.deepEqual(
    reference(operands, options)(
      [
        { id: 'ent1', $ref: 'entry' },
        { id: 'ent2', $ref: 'entry' },
      ],
      stateRev
    ),
    expected
  )
  t.deepEqual(
    reference(operands, options)(
      [{ id: 'ent1', $ref: 'entry' }, { id: 'ent2' }],
      stateRev
    ),
    expected
  )
})

test('should keep isNew and isDeleted when true in reverse', (t) => {
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isNew: true }, stateRev),
    { id: 'ent1', isNew: true }
  )
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isDeleted: true }, stateRev),
    { id: 'ent1', isDeleted: true }
  )
  t.deepEqual(
    reference(operands, options)(
      { id: 'ent1', isNew: true, isDeleted: true },
      stateRev
    ),
    { id: 'ent1', isNew: true, isDeleted: true }
  )
})

test('should not keep isNew and isDeleted when false in reverse', (t) => {
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isNew: false }, stateRev),
    { id: 'ent1' }
  )
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isDeleted: false }, stateRev),
    { id: 'ent1' }
  )
  t.deepEqual(
    reference(operands, options)(
      { id: 'ent1', isNew: false, isDeleted: true },
      stateRev
    ),
    { id: 'ent1', isDeleted: true }
  )
})

test('should transform illegal values to undefined', (t) => {
  t.is(reference(operands, options)({}, state), undefined)
  t.is(
    reference(operands, options)({ noid: '12345', title: 'Wrong' }, state),
    undefined
  )
  t.is(reference(operands, options)(new Date('No date'), state), undefined)
  t.is(reference(operands, options)(NaN, state), undefined)
  t.is(reference(operands, options)(true, state), undefined)
  t.is(reference(operands, options)(false, state), undefined)
})

test('should return undefined when existing $ref does not match type', (t) => {
  const value = {
    $ref: 'user',
    id: 'johnf',
  }
  const expected = undefined

  const ret = reference(operands, options)(value, state)

  t.is(ret, expected)
})

test('should not touch object with $type', (t) => {
  const value = {
    $type: 'entry',
    id: 'ent1',
    title: 'Entry 1',
  }
  const expected = value

  const ret = reference(operands, options)(value, state)

  t.deepEqual(ret, expected)
})

test('should return undefined when $type does not match type', (t) => {
  const value = {
    $type: 'user',
    id: 'johnf',
    name: 'John F.',
  }
  const expected = undefined

  const ret = reference(operands, options)(value, state)

  t.is(ret, expected)
})

test('should not touch null and undefined', (t) => {
  t.is(reference(operands, options)(null, state), null)
  t.is(reference(operands, options)(undefined, state), undefined)
  t.is(reference(operands, options)(null, stateRev), null)
  t.is(reference(operands, options)(undefined, stateRev), undefined)
})

test('should iterate array', (t) => {
  const value = [
    'ent1',
    { id: 'ent1' },
    { id: 12345, $ref: 'entry' },
    new Date('2019-05-22T13:43:11.345Z'),
    null,
    undefined,
    true,
    {},
  ]
  const expected = [
    createRel('ent1'),
    createRel('ent1'),
    createRel('12345'),
    createRel('1558532591345'),
    null,
    undefined,
    undefined,
    undefined,
  ]

  const ret = reference(operands, options)(value, state)

  t.deepEqual(ret, expected)
})

test('should iterate array in reverse', (t) => {
  const value = [
    createRel('ent1'),
    createRel(12345),
    createRel(null),
    'ent1',
    { id: 'ent1' },
    null,
    undefined,
  ]
  const expected = [
    { id: 'ent1' },
    { id: '12345' },
    null,
    { id: 'ent1' },
    { id: 'ent1' },
    null,
    undefined,
  ]

  const ret = reference(operands, options)(value, stateRev)

  t.deepEqual(ret, expected)
})

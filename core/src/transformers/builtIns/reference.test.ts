import test from 'ava'
import { Reference } from '../../types'

import reference from './reference'

// Setup

const operands = { type: 'entry' }
const options = {}
const context = { rev: false, onlyMappedValues: false }
const contextRev = { rev: true, onlyMappedValues: false }

const createRel = (
  id: string | number | null,
  props: Partial<Reference> = { $ref: 'entry' }
) => ({
  id: typeof id === 'number' ? String(id) : id,
  ...props,
})

// Tests

test('should return relationship object from value', (t) => {
  t.deepEqual(reference(operands, options)('ent1', context), createRel('ent1'))
  t.deepEqual(
    reference(operands, options)({ id: 'ent1' }, context),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', $ref: 'entry' }, context),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands, options)({ id: 12345, $ref: 'entry' }, context),
    createRel('12345')
  )
  t.deepEqual(
    reference(operands, options)(new Date('2019-05-22T13:43:11.345Z'), context),
    createRel('1558532591345')
  )
})

test('should return array of relationship objects from value', (t) => {
  const expected = [createRel('ent1'), createRel('ent2')]

  t.deepEqual(reference(operands, options)(['ent1', 'ent2'], context), expected)
  t.deepEqual(
    reference(operands, options)([{ id: 'ent1' }, { id: 'ent2' }], context),
    expected
  )
  t.deepEqual(
    reference(operands, options)(
      [
        { id: 'ent1', $ref: 'entry' },
        { id: 'ent2', $ref: 'entry' },
      ],
      context
    ),
    expected
  )
  t.deepEqual(
    reference(operands, options)(
      [{ id: 'ent1', $ref: 'entry' }, { id: 'ent2' }],
      context
    ),
    expected
  )
})

test('should keep isNew and isDeleted when true', (t) => {
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isNew: true }, context),
    createRel('ent1', { isNew: true, $ref: 'entry' })
  )
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isDeleted: true }, context),
    createRel('ent1', { isDeleted: true, $ref: 'entry' })
  )
  t.deepEqual(
    reference(operands, options)(
      { id: 'ent1', isNew: true, isDeleted: true },
      context
    ),
    createRel('ent1', { isNew: true, isDeleted: true, $ref: 'entry' })
  )
})

test('should not keep isNew and isDeleted when false', (t) => {
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isNew: false }, context),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isDeleted: false }, context),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands, options)(
      { id: 'ent1', isNew: false, isDeleted: true },
      context
    ),
    createRel('ent1', { isDeleted: true, $ref: 'entry' })
  )
})

test('should return relationship object in reverse', (t) => {
  t.deepEqual(
    reference(operands, options)('ent1', contextRev),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', $ref: 'entry' }, contextRev),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands, options)({ id: 'ent1' }, contextRev),
    createRel('ent1')
  )
})

test('should return array of relationship objects in reverse', (t) => {
  const expected = [createRel('ent1'), createRel('ent2')]

  t.deepEqual(
    reference(operands, options)(['ent1', 'ent2'], contextRev),
    expected
  )
  t.deepEqual(
    reference(operands, options)([{ id: 'ent1' }, { id: 'ent2' }], contextRev),
    expected
  )
  t.deepEqual(
    reference(operands, options)(
      [
        { id: 'ent1', $ref: 'entry' },
        { id: 'ent2', $ref: 'entry' },
      ],
      contextRev
    ),
    expected
  )
  t.deepEqual(
    reference(operands, options)(
      [{ id: 'ent1', $ref: 'entry' }, { id: 'ent2' }],
      contextRev
    ),
    expected
  )
})

test('should keep isNew and isDeleted when true in reverse', (t) => {
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isNew: true }, contextRev),
    createRel('ent1', { isNew: true, $ref: 'entry' })
  )
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isDeleted: true }, contextRev),
    createRel('ent1', { isDeleted: true, $ref: 'entry' })
  )
  t.deepEqual(
    reference(operands, options)(
      { id: 'ent1', isNew: true, isDeleted: true },
      contextRev
    ),
    createRel('ent1', { isNew: true, isDeleted: true, $ref: 'entry' })
  )
})

test('should not keep isNew and isDeleted when false in reverse', (t) => {
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isNew: false }, contextRev),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands, options)({ id: 'ent1', isDeleted: false }, contextRev),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands, options)(
      { id: 'ent1', isNew: false, isDeleted: true },
      contextRev
    ),
    createRel('ent1', { isDeleted: true, $ref: 'entry' })
  )
})

test('should transform illegal values to undefined', (t) => {
  t.is(reference(operands, options)({}, context), undefined)
  t.is(
    reference(operands, options)({ noid: '12345', title: 'Wrong' }, context),
    undefined
  )
  t.is(reference(operands, options)(new Date('No date'), context), undefined)
  t.is(reference(operands, options)(NaN, context), undefined)
  t.is(reference(operands, options)(true, context), undefined)
  t.is(reference(operands, options)(false, context), undefined)
})

test('should return undefined when existing $ref does not match type', (t) => {
  const value = {
    $ref: 'user',
    id: 'johnf',
  }
  const expected = undefined

  const ret = reference(operands, options)(value, context)

  t.is(ret, expected)
})

test('should not touch object with $type', (t) => {
  const value = {
    $type: 'entry',
    id: 'ent1',
    title: 'Entry 1',
  }
  const expected = value

  const ret = reference(operands, options)(value, context)

  t.deepEqual(ret, expected)
})

test('should return undefined when $type does not match type', (t) => {
  const value = {
    $type: 'user',
    id: 'johnf',
    name: 'John F.',
  }
  const expected = undefined

  const ret = reference(operands, options)(value, context)

  t.is(ret, expected)
})

test('should not touch null and undefined', (t) => {
  t.is(reference(operands, options)(null, context), null)
  t.is(reference(operands, options)(undefined, context), undefined)
  t.is(reference(operands, options)(null, contextRev), null)
  t.is(reference(operands, options)(undefined, contextRev), undefined)
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

  const ret = reference(operands, options)(value, context)

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
    createRel('ent1'),
    createRel('12345'),
    null,
    createRel('ent1'),
    createRel('ent1'),
    null,
    undefined,
  ]

  const ret = reference(operands, options)(value, contextRev)

  t.deepEqual(ret, expected)
})

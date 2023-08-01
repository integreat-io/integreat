import test from 'ava'
import Schema from '../Schema.js'
import type { Reference } from '../../types.js'

import nonPrimitive from './nonPrimitive.js'

// Setup

const schemas = new Map()
const entrySchema = new Schema({
  id: 'entry',
  shape: { id: { $type: 'string' }, title: { $type: 'string' } },
}, schemas)
schemas.set('entry', entrySchema)

const createRef = (
  id: string | number | null,
  props: Partial<Reference> = { $ref: 'entry' }
) => ({
  id: typeof id === 'number' ? String(id) : id,
  ...props,
})

// Tests

test('should return reference object from value', (t) => {
  t.deepEqual(nonPrimitive('entry', schemas)('ent1', false), createRef('ent1'))
  t.deepEqual(
    nonPrimitive('entry', schemas)({ id: 'ent1' }, false),
    createRef('ent1')
  )
  t.deepEqual(
    nonPrimitive('entry', schemas)({ id: 'ent1', $ref: 'entry' }, false),
    createRef('ent1')
  )
  t.deepEqual(
    nonPrimitive('entry', schemas)({ id: 12345, $ref: 'entry' }, false),
    createRef('12345')
  )
  t.deepEqual(
    nonPrimitive('entry', schemas)(new Date('2019-05-22T13:43:11.345Z'), false),
    createRef('1558532591345')
  )
})

test('should keep isNew and isDeleted when true', (t) => {
  t.deepEqual(
    nonPrimitive('entry', schemas)({ id: 'ent1', isNew: true }, false),
    createRef('ent1', { isNew: true, $ref: 'entry' })
  )
  t.deepEqual(
    nonPrimitive('entry', schemas)({ id: 'ent1', isDeleted: true }, false),
    createRef('ent1', { isDeleted: true, $ref: 'entry' })
  )
  t.deepEqual(
    nonPrimitive('entry', schemas)(
      { id: 'ent1', isNew: true, isDeleted: true },
      false
    ),
    createRef('ent1', { isNew: true, isDeleted: true, $ref: 'entry' })
  )
})

test('should not keep isNew and isDeleted when false', (t) => {
  t.deepEqual(
    nonPrimitive('entry', schemas)({ id: 'ent1', isNew: false }, false),
    createRef('ent1')
  )
  t.deepEqual(
    nonPrimitive('entry', schemas)({ id: 'ent1', isDeleted: false }, false),
    createRef('ent1')
  )
  t.deepEqual(
    nonPrimitive('entry', schemas)(
      { id: 'ent1', isNew: false, isDeleted: true },
      false
    ),
    createRef('ent1', { isDeleted: true, $ref: 'entry' })
  )
})

test('should return reference object in reverse', (t) => {
  t.deepEqual(nonPrimitive('entry', schemas)('ent1', true), { id: 'ent1' })
  t.deepEqual(
    nonPrimitive('entry', schemas)({ id: 'ent1', $ref: 'entry' }, true),
    {
      id: 'ent1',
    }
  )
  t.deepEqual(nonPrimitive('entry', schemas)({ id: 'ent1' }, true), {
    id: 'ent1',
  })
})

test('should keep isNew and isDeleted when true in reverse', (t) => {
  t.deepEqual(
    nonPrimitive('entry', schemas)({ id: 'ent1', isNew: true }, true),
    {
      id: 'ent1',
      isNew: true,
    }
  )
  t.deepEqual(
    nonPrimitive('entry', schemas)({ id: 'ent1', isDeleted: true }, true),
    {
      id: 'ent1',
      isDeleted: true,
    }
  )
  t.deepEqual(
    nonPrimitive('entry', schemas)(
      { id: 'ent1', isNew: true, isDeleted: true },
      true
    ),
    { id: 'ent1', isNew: true, isDeleted: true }
  )
})

test('should not keep isNew and isDeleted when false in reverse', (t) => {
  t.deepEqual(
    nonPrimitive('entry', schemas)({ id: 'ent1', isNew: false }, true),
    {
      id: 'ent1',
    }
  )
  t.deepEqual(
    nonPrimitive('entry', schemas)({ id: 'ent1', isDeleted: false }, true),
    {
      id: 'ent1',
    }
  )
  t.deepEqual(
    nonPrimitive('entry', schemas)(
      { id: 'ent1', isNew: false, isDeleted: true },
      true
    ),
    { id: 'ent1', isDeleted: true }
  )
})

test('should cast as typed data when more props than id and $ref', (t) => {
  const value = {
    id: 'ent1',
    title: 'First entry',
  }
  const expected = {
    id: 'ent1',
    $type: 'entry',
    title: 'First entry',
  }

  const ret = nonPrimitive('entry', schemas)(value, false)

  t.deepEqual(ret, expected)
})

test('should cast as typed data when more props than id and $ref - in reverse', (t) => {
  const value = {
    id: 'ent1',
    title: 'First entry',
  }
  const expected = {
    id: 'ent1',
    title: 'First entry',
  }

  const ret = nonPrimitive('entry', schemas)(value, true)

  t.deepEqual(ret, expected)
})

test('should cast typed data in reverse', (t) => {
  const value = {
    id: 'ent1',
    $type: 'entry',
    title: 'First entry',
  }
  const expected = {
    id: 'ent1',
    title: 'First entry',
  }

  const ret = nonPrimitive('entry', schemas)(value, true)

  t.deepEqual(ret, expected)
})

test('should pick up cast fn after first initialization', (t) => {
  const schemas = new Map()
  const value = {
    id: 'ent1',
    title: 'First entry',
  }
  const expected = {
    id: 'ent1',
    $type: 'entry',
    title: 'First entry',
  }

  const castRef = nonPrimitive('entry', schemas)
  schemas.set('entry', entrySchema) // This happens after first initialization
  const ret = castRef(value, false)

  t.deepEqual(ret, expected)
})

test('should transform illegal values to undefined', (t) => {
  t.is(nonPrimitive('entry', schemas)({}, false), undefined)
  t.is(nonPrimitive('entry', schemas)(new Date('No date'), false), undefined)
  t.is(nonPrimitive('entry', schemas)(NaN, false), undefined)
  t.is(nonPrimitive('entry', schemas)(true, false), undefined)
  t.is(nonPrimitive('entry', schemas)(false, false), undefined)
})

test('should return undefined when existing $ref does not match type', (t) => {
  const value = {
    $ref: 'user',
    id: 'johnf',
  }
  const expected = undefined

  const ret = nonPrimitive('entry', schemas)(value, false)

  t.is(ret, expected)
})

test('should not touch object with $type', (t) => {
  const value = {
    $type: 'entry',
    id: 'ent1',
    title: 'Entry 1',
  }
  const expected = value

  const ret = nonPrimitive('entry', schemas)(value, false)

  t.deepEqual(ret, expected)
})

test('should return undefined when $type does not match type', (t) => {
  const value = {
    $type: 'user',
    id: 'johnf',
    name: 'John F.',
  }
  const expected = undefined

  const ret = nonPrimitive('entry', schemas)(value, false)

  t.is(ret, expected)
})

test('should not touch null and undefined', (t) => {
  t.is(nonPrimitive('entry', schemas)(null, false), null)
  t.is(nonPrimitive('entry', schemas)(undefined, false), undefined)
  t.is(nonPrimitive('entry', schemas)(null, true), null)
  t.is(nonPrimitive('entry', schemas)(undefined, true), undefined)
})

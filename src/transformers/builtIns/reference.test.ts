import test from 'ava'

import reference from './reference'

// Setup

const operands = { type: 'entry' }
const context = {}
const contextRev = { type: 'entry', rev: true }

const createRel = (id: string, type = 'entry') => ({ id, $ref: type })

// Tests

test('should return relationship object from value', t => {
  t.deepEqual(reference(operands)('ent1', context), createRel('ent1'))
  t.deepEqual(reference(operands)({ id: 'ent1' }, context), createRel('ent1'))
  t.deepEqual(
    reference(operands)({ id: 'ent1', $ref: 'entry' }, context),
    createRel('ent1')
  )
  t.deepEqual(
    reference(operands)({ id: 12345, $ref: 'entry' }, context),
    createRel('12345')
  )
  t.deepEqual(
    reference(operands)(new Date('2019-05-22T13:43:11.345Z'), context),
    createRel('1558532591345')
  )
})

test('should return just the id in reverse', t => {
  t.deepEqual(reference(operands)('ent1', contextRev), 'ent1')
  t.deepEqual(reference(operands)({ id: 'ent1', $ref: 'entry' }, contextRev), 'ent1')
  t.deepEqual(reference(operands)({ id: 'ent1' }, contextRev), 'ent1')
})

test('should transform illegal values to undefined', t => {
  t.is(reference(operands)({}, context), undefined)
  t.is(reference(operands)({ noid: '12345', title: 'Wrong' }, context), undefined)
  t.is(reference(operands)(new Date('No date'), context), undefined)
  t.is(reference(operands)(NaN, context), undefined)
  t.is(reference(operands)(true, context), undefined)
  t.is(reference(operands)(false, context), undefined)
})

test('should return undefined when existing $ref does not match type', t => {
  const value = {
    $ref: 'user',
    id: 'johnf'
  }
  const expected = undefined

  const ret = reference(operands)(value, context)

  t.is(ret, expected)
})

test('should not touch object with $schema', t => {
  const value = {
    $schema: 'entry',
    id: 'ent1',
    title: 'Entry 1'
  }
  const expected = value

  const ret = reference(operands)(value, context)

  t.deepEqual(ret, expected)
})

test('should return undefined when $schema does not match type', t => {
  const value = {
    $schema: 'user',
    id: 'johnf',
    name: 'John F.'
  }
  const expected = undefined

  const ret = reference(operands)(value, context)

  t.is(ret, expected)
})

test('should not touch null and undefined', t => {
  t.is(reference(operands)(null, context), null)
  t.is(reference(operands)(undefined, context), undefined)
  t.is(reference(operands)(null, contextRev), null)
  t.is(reference(operands)(undefined, contextRev), undefined)
})

test('should iterate array', t => {
  const value = [
    'ent1',
    { id: 'ent1' },
    { id: 12345, $ref: 'entry' },
    new Date('2019-05-22T13:43:11.345Z'),
    null,
    undefined,
    true,
    {} as any
  ]
  const expected = [
    createRel('ent1'),
    createRel('ent1'),
    createRel('12345'),
    createRel('1558532591345'),
    null,
    undefined,
    undefined,
    undefined
  ]

  const ret = reference(operands)(value, context)

  t.deepEqual(ret, expected)
})

test('should iterate array in reverse', t => {
  const value = [
    createRel('ent1'),
    createRel(12345 as any),
    createRel(null as any),
    'ent1',
    { id: 'ent1' },
    null,
    undefined
  ]
  const expected = [
    'ent1',
    '12345',
    null,
    'ent1',
    'ent1',
    null,
    undefined
  ]

  const ret = reference(operands)(value, contextRev)

  t.deepEqual(ret, expected)
})

test.todo('cast should cast relationship object with id array')
test.todo('cast should cast relationship object with meta')
test.todo('cast should keep isNew when true')
test.todo('cast should keep isDeleted when true')
test.todo('cast should remove isTrue and isDeleted when false')

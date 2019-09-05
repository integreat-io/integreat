import test from 'ava'

import equalOrNoSchema from './equalOrNoSchema'

// Setup

const operands = {
  type: 'entry'
}

// Tests

test('should return true when item has given schema type', t => {
  const item = {
    $type: 'entry',
    id: 'ent1',
    title: 'Entry 1'
  }

  const ret = equalOrNoSchema(operands)(item)

  t.true(ret)
})

test('should return false when item has other schema type', t => {
  const item = {
    $type: 'user',
    id: 'johnf',
    name: 'John F.'
  }

  const ret = equalOrNoSchema(operands)(item)

  t.false(ret)
})

test('should return true when item has no schema', t => {
  const item = {
    id: 'ent1',
    title: 'Entry 1'
  }

  const ret = equalOrNoSchema(operands)(item)

  t.true(ret)
})

test('should return true when no type is given', t => {
  const item = {
    id: 'ent1',
    title: 'Entry 1'
  }

  const ret = equalOrNoSchema({})(item)

  t.true(ret)
})

test('should return true when not an object', t => {
  t.true(equalOrNoSchema(operands)('A string'))
  t.true(equalOrNoSchema(operands)(new Date('Not a date')))
  t.true(equalOrNoSchema(operands)(NaN))
  t.true(equalOrNoSchema(operands)(true))
})

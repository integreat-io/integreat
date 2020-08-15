import test from 'ava'

import trans from './removeTypePrefixOnId'

// Setup

const operands = {}
const options = {}
const context = {
  rev: false,
  onlyMappedValues: false,
}
const contextRev = {
  rev: true,
  onlyMappedValues: false,
}

// Tests -- from service

test('should remove type going from service', (t) => {
  const item = { id: 'entry:ent1', $type: 'entry' }
  const expected = { id: 'ent1', $type: 'entry' }

  const ret = trans(operands, options)(item, context)

  t.deepEqual(ret, expected)
})

test('should not touch unprefixed id going from service', (t) => {
  const item = { id: 'ent1', $type: 'entry' }

  const ret = trans(operands, options)(item, context)

  t.deepEqual(ret, item)
})

// Tests -- to service

test('should add type going to service', (t) => {
  const item = { id: 'ent1', $type: 'entry' }
  const expected = { id: 'entry:ent1', $type: 'entry' }

  const ret = trans(operands, options)(item, contextRev)

  t.deepEqual(ret, expected)
})

test('should not touch prefixed id going to service', (t) => {
  const item = { id: 'entry:ent1', $type: 'entry' }

  const ret = trans(operands, options)(item, contextRev)

  t.deepEqual(ret, item)
})

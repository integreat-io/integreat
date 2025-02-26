import test from 'node:test'
import assert from 'node:assert/strict'

import expandShape from './expandShape.js'

// Tests

test('should expand shortcuts in shape', () => {
  const shape = {
    id: 'string',
    type: { $type: 'string', const: 'entry' },
    title: { $type: 'string', default: 'Entry with no name' },
    abstract: { $type: 'string' },
    age: 'integer',
    long: 'float',
    lat: 'number',
    active: 'boolean',
    createdAt: 'date',
    author: 'user',
    payload: 'object',
    data: 'unknown',
    comments: 'comment[]',
    'props[]': {
      key: 'string',
      value: 'string',
    },
  }
  const expected = {
    id: { $type: 'string' },
    type: { $type: 'string', const: 'entry' },
    title: { $type: 'string', default: 'Entry with no name' },
    abstract: { $type: 'string' },
    age: { $type: 'integer' },
    long: { $type: 'float' },
    lat: { $type: 'number' },
    active: { $type: 'boolean' },
    createdAt: { $type: 'date' },
    author: { $type: 'user' },
    payload: { $type: 'object' },
    data: { $type: 'unknown' },
    comments: { $type: 'comment[]' },
    'props[]': {
      key: { $type: 'string' },
      value: { $type: 'string' },
    },
  }

  const ret = expandShape(shape)

  assert.deepEqual(ret, expected)
})

test('should add id if missing', () => {
  const shape = {
    title: { $type: 'string', default: 'Entry with no name' },
  }
  const expected = {
    id: { $type: 'string' },
    title: { $type: 'string', default: 'Entry with no name' },
  }

  const ret = expandShape(shape)

  assert.deepEqual(ret, expected)
})

test('should throw when id is not a string', () => {
  const shape = {
    id: { $type: 'integer' },
    title: { $type: 'string', default: 'Entry with no name' },
  }
  const expectedError = { name: 'Error', message: "'id' must be a string" }

  assert.throws(() => expandShape(shape), expectedError)
})

test('should throw when createdAt is not a date', () => {
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string', default: 'Entry with no name' },
    createdAt: { $type: 'integer' },
  }
  const expectedError = { name: 'Error', message: "'createdAt' must be a date" }

  assert.throws(() => expandShape(shape), expectedError)
})

test('should throw when updatedAt is not a date', () => {
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string', default: 'Entry with no name' },
    updatedAt: { $type: 'integer' },
  }
  const expectedError = { name: 'Error', message: "'updatedAt' must be a date" }

  assert.throws(() => expandShape(shape), expectedError)
})

test('should do all tests before throwing', () => {
  const shape = {
    id: { $type: 'integer' },
    title: { $type: 'string', default: 'Entry with no name' },
    createdAt: { $type: 'integer' },
    updatedAt: { $type: 'integer' },
  }
  const expectedError = {
    name: 'Error',
    message:
      "'id' must be a string. 'createdAt' must be a date. 'updatedAt' must be a date",
  }

  assert.throws(() => expandShape(shape), expectedError)
})

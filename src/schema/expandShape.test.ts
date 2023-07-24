import test from 'ava'

import expandShape from './expandShape.js'

// Tests

test('should expand shortcuts in shape', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should add id if missing', (t) => {
  const shape = {
    title: { $type: 'string', default: 'Entry with no name' },
  }
  const expected = {
    id: { $type: 'string' },
    title: { $type: 'string', default: 'Entry with no name' },
  }

  const ret = expandShape(shape)

  t.deepEqual(ret, expected)
})

test('should throw when id is not a string', (t) => {
  const shape = {
    id: { $type: 'integer' },
    title: { $type: 'string', default: 'Entry with no name' },
  }

  const error = t.throws(() => expandShape(shape))

  t.is((error as Error).message, "'id' must be a string")
})

test('should throw when createdAt is not a date', (t) => {
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string', default: 'Entry with no name' },
    createdAt: { $type: 'integer' },
  }

  const error = t.throws(() => expandShape(shape))

  t.is((error as Error).message, "'createdAt' must be a date")
})

test('should throw when updatedAt is not a date', (t) => {
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string', default: 'Entry with no name' },
    updatedAt: { $type: 'integer' },
  }

  const error = t.throws(() => expandShape(shape))

  t.is((error as Error).message, "'updatedAt' must be a date")
})

test('should do all tests before throwing', (t) => {
  const shape = {
    id: { $type: 'integer' },
    title: { $type: 'string', default: 'Entry with no name' },
    createdAt: { $type: 'integer' },
    updatedAt: { $type: 'integer' },
  }

  const error = t.throws(() => expandShape(shape))

  t.is(
    (error as Error).message,
    "'id' must be a string. 'createdAt' must be a date. 'updatedAt' must be a date"
  )
})

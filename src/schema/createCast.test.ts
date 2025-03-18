import test from 'node:test'
import assert from 'node:assert/strict'
import expandShape from './expandShape.js'
import Schema from './Schema.js'
import type { ShapeDef } from './types.js'
import type { TypedData } from '../types.js'

import createCast from './createCast.js'

// Setup

const schemas = new Map()
schemas.set(
  'comment',
  new Schema(
    {
      id: 'comment',
      shape: { id: 'string', comment: 'string' },
    },
    schemas,
  ),
)
schemas.set(
  'user',
  new Schema(
    {
      id: 'user',
      shape: { id: 'string', name: 'string' },
    },
    schemas,
  ),
)

// Tests

test('should create mapping function from schema', () => {
  const isRev = false
  const shape = expandShape({
    id: 'string',
    type: { $type: 'string', const: 'entry' },
    title: { $type: 'string', default: 'Entry with no name' },
    abstract: { $type: 'string', default: '' },
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
  })
  const data = [
    {
      id: 12345,
      type: 'unknown',
      title: 'Entry 1',
      abstract: 'The first entry',
      age: '180734118',
      long: '60.382732',
      lat: '5.326373',
      active: 'true',
      createdAt: '2019-03-11T18:43:09Z',
      author: 'johnf',
      payload: { type: 'entry', data: [{ id: 'ent1', $type: 'entry' }] },
      data: [{ title: 'Something' }],
      comments: [{ id: 'comment12', $ref: 'comment' }, { id: 'comment13' }],
      props: [
        { key: 'sourceCheckBy', value: 'Anita' },
        { key: 'proofReadBy', value: 'Svein' },
      ],
    },
    {
      id: 'ent2',
      age: 244511383,
      createdAt: new Date('2019-03-12T09:40:43Z'),
      author: 'maryk',
      comments: 'comment23',
    },
  ]
  const expected = [
    {
      $type: 'entry',
      id: '12345',
      type: 'entry',
      title: 'Entry 1',
      abstract: 'The first entry',
      age: 180734118,
      long: 60.382732,
      lat: 5.326373,
      active: true,
      createdAt: new Date('2019-03-11T18:43:09Z'),
      author: { id: 'johnf', $ref: 'user' },
      payload: { type: 'entry', data: [{ id: 'ent1', $type: 'entry' }] },
      data: [{ title: 'Something' }],
      comments: [
        { id: 'comment12', $ref: 'comment' },
        { id: 'comment13', $ref: 'comment' },
      ],
      props: [
        { key: 'sourceCheckBy', value: 'Anita' },
        { key: 'proofReadBy', value: 'Svein' },
      ],
    },
    {
      $type: 'entry',
      id: 'ent2',
      type: 'entry',
      title: 'Entry with no name',
      abstract: '',
      age: 244511383,
      createdAt: new Date('2019-03-12T09:40:43Z'),
      author: { id: 'maryk', $ref: 'user' },
      comments: [{ id: 'comment23', $ref: 'comment' }],
    },
  ]

  const ret = createCast(shape, 'entry')(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should reverse transform with mapping definition from schema', () => {
  const isRev = true
  const shape = expandShape({
    id: 'string',
    type: { $type: 'string', const: 'entry' },
    title: { $type: 'string', default: 'Entry with no name' },
    abstract: { $type: 'string', default: '' },
    age: 'integer',
    long: 'float',
    lat: 'number',
    active: 'boolean',
    comments: 'comment[]',
    createdAt: 'date',
    author: 'user',
    payload: 'object',
  })
  const data = [
    {
      $type: 'entry',
      id: 12345,
      type: 'unknown',
      title: 'Entry 1',
      abstract: 'The first entry',
      age: '180734118',
      long: '60.382732',
      lat: '5.326373',
      active: 'true',
      createdAt: '2019-03-11T18:43:09Z',
      author: 'johnf',
      payload: { type: 'entry', data: [{ id: 'ent1', $type: 'entry' }] },
      comments: ['comment12', { id: 'comment13', $ref: 'comment' }],
    },
    {
      $type: 'entry',
      id: 'ent2',
      age: 244511383,
      createdAt: new Date('2019-03-12T09:40:43Z'),
      author: { id: 'maryk' },
      comments: [{ id: 'comment23', $ref: 'comment' }],
    },
    {
      $type: 'entry',
      id: 'ent3',
      createdAt: new Date('2019-03-18T05:14:59Z'),
      age: '180735220',
      author: 'whatson',
    },
  ]
  const expected = [
    {
      id: '12345',
      type: 'entry',
      title: 'Entry 1',
      abstract: 'The first entry',
      age: 180734118,
      long: 60.382732,
      lat: 5.326373,
      active: true,
      createdAt: new Date('2019-03-11T18:43:09Z'),
      author: { id: 'johnf' },
      payload: { type: 'entry', data: [{ id: 'ent1', $type: 'entry' }] }, // This $type is not filtered away, as this is an `object` schema
      comments: [{ id: 'comment12' }, { id: 'comment13' }],
    },
    {
      id: 'ent2',
      title: 'Entry with no name',
      abstract: '',
      type: 'entry',
      age: 244511383,
      createdAt: new Date('2019-03-12T09:40:43Z'),
      author: { id: 'maryk' },
      comments: [{ id: 'comment23' }],
    },
    {
      id: 'ent3',
      title: 'Entry with no name',
      abstract: '',
      type: 'entry',
      age: 180735220,
      createdAt: new Date('2019-03-18T05:14:59Z'),
      author: { id: 'whatson' },
    },
  ]

  const ret = createCast(shape, 'entry')(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should be iteratable', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = [
    {
      id: 1,
      title: 'Entry 1',
    },
    {
      id: 2,
      title: 'Entry 2',
    },
  ]
  const expected = [
    {
      $type: 'entry',
      id: '1',
      title: 'Entry 1',
    },
    {
      $type: 'entry',
      id: '2',
      title: 'Entry 2',
    },
  ]

  const ret = createCast(shape, 'entry')(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should cast missing id to null', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = { title: 'Entry 1' }
  const expected = { id: null, $type: 'entry', title: 'Entry 1' }

  const ret = createCast(shape, 'entry')(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should cast missing id to generated unique id', () => {
  const isRev = false
  const doGenerateId = true
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = { title: 'Entry 1' }

  const ret = createCast(
    shape,
    'entry',
    schemas,
    doGenerateId,
  )(data, isRev) as TypedData

  const { id } = ret
  assert.equal(typeof id, 'string')
  assert.equal((id as string).length >= 21, true) // We don't know what the id will be, but it should be at least 21 chars
})

test('should unwrap value from { $value } object', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = { id: { $value: 'ent1' }, title: { $value: 'Entry 1' } }
  const expected = { id: 'ent1', $type: 'entry', title: 'Entry 1' }

  const ret = createCast(shape, 'entry')(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should unwrap item from array when field is not expecting array and there is only one item', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = { id: 'ent1', title: ['Entry 1'] }
  const expected = { id: 'ent1', $type: 'entry', title: 'Entry 1' }

  const ret = createCast(shape, 'entry')(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should not set value from array with more items when not expecting array', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = { id: 'ent1', title: ['Entry 1', 'Entry 2'] }
  const expected = { id: 'ent1', $type: 'entry' }

  const ret = createCast(shape, 'entry')(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should not cast null', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = null
  const expected = undefined

  const ret = createCast(shape, 'entry')(data, isRev)

  assert.equal(ret, expected)
})

test('should cast non-primitive fields with schema', () => {
  const isRev = false
  const shape = expandShape({
    id: 'string',
    type: { $type: 'string', const: 'entry' },
    attributes: {
      title: { $type: 'string', default: 'Entry with no name' },
      age: 'integer',
    },
    relationships: {
      author: 'user',
      comments: 'comment[]',
    },
  })
  const data = [
    {
      id: 12345,
      type: 'entry',
      attributes: { title: 'Entry 1', age: '180734118' },
      relationships: {
        author: { id: 'johnf', name: 'John F' },
        comments: [{ id: 'comment12', $ref: 'comment' }, { id: 'comment13' }],
        unknown: 'Drop this',
      },
    },
    {
      id: 'ent2',
      attributes: { age: 244511383 },
      relationships: {
        author: 'maryk',
        comments: 'comment23',
      },
    },
    {
      id: 'ent3',
      attributes: { title: 'Entry 3', age: 0 },
      relationships: {},
    },
    {
      id: 'ent4',
      attributes: { title: 'Entry 4' },
      relationships: { author: null },
    },
  ]
  const expected = [
    {
      $type: 'entry',
      id: '12345',
      type: 'entry',
      attributes: { title: 'Entry 1', age: 180734118 },
      relationships: {
        author: { id: 'johnf', $type: 'user', name: 'John F' },
        comments: [
          { id: 'comment12', $ref: 'comment' },
          { id: 'comment13', $ref: 'comment' },
        ],
      },
    },
    {
      $type: 'entry',
      id: 'ent2',
      type: 'entry',
      attributes: { title: 'Entry with no name', age: 244511383 },
      relationships: {
        author: { id: 'maryk', $ref: 'user' },
        comments: [{ id: 'comment23', $ref: 'comment' }],
      },
    },
    {
      $type: 'entry',
      id: 'ent3',
      type: 'entry',
      attributes: { title: 'Entry 3', age: 0 },
      relationships: {},
    },
    {
      $type: 'entry',
      id: 'ent4',
      type: 'entry',
      attributes: { title: 'Entry 4' },
      relationships: { author: null },
    },
  ]

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should cast non-primitive fields with schema in reverse', () => {
  const isRev = true
  const shape = expandShape({
    id: 'string',
    type: { $type: 'string', const: 'entry' },
    attributes: {
      title: { $type: 'string', default: 'Entry with no name' },
      age: 'integer',
    },
    relationships: {
      comments: 'comment[]',
      author: 'user',
    },
  })
  const data = [
    {
      $type: 'entry',
      id: 12345,
      type: 'entry',
      attributes: { title: 'Entry 1', age: '180734118' },
      relationships: {
        author: { id: 'johnf', $type: 'user', name: 'John F' },
        comments: [
          { id: 'comment12', $ref: 'comment' },
          { id: 'comment13', $ref: 'comment' },
        ],
        unknown: 'Drop this',
      },
    },
    {
      $type: 'entry',
      id: 'ent2',
      attributes: { age: 244511383 },
      relationships: {
        author: { id: 'maryk', $ref: 'user' },
        comments: [{ id: 'comment23', $ref: 'comment' }],
      },
    },
    {
      $type: 'entry',
      id: 'ent3',
      attributes: { title: 'Entry 3', age: 0 },
      relationships: {},
    },
  ]
  const expected = [
    {
      id: '12345',
      type: 'entry',
      attributes: { title: 'Entry 1', age: 180734118 },
      relationships: {
        author: { id: 'johnf', name: 'John F' },
        comments: [{ id: 'comment12' }, { id: 'comment13' }],
      },
    },
    {
      id: 'ent2',
      type: 'entry',
      attributes: { title: 'Entry with no name', age: 244511383 },
      relationships: {
        author: { id: 'maryk' },
        comments: [{ id: 'comment23' }],
      },
    },
    {
      id: 'ent3',
      type: 'entry',
      attributes: { title: 'Entry 3', age: 0 },
      relationships: {},
    },
  ]

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should set createdAt and updatedAt if not set and present in schema', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
    createdAt: { $type: 'date' },
    updatedAt: { $type: 'date' },
  }
  const data = {
    id: 'ent1',
    title: 'Entry 1',
  }
  const before = Date.now()

  const ret = createCast(shape, 'entry', schemas)(data, isRev) as TypedData

  const after = Date.now()
  assert.equal(ret.createdAt instanceof Date, true)
  assert.equal((ret.createdAt as Date).getTime() <= after, true)
  assert.equal(ret.updatedAt instanceof Date, true)
  assert.equal((ret.createdAt as Date).getTime() >= before, true)
  assert.deepEqual(ret.createdAt, ret.updatedAt)
})

test('should set only createdAt if not set and present in schema', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
    createdAt: { $type: 'date' },
  }
  const data = {
    id: 'ent1',
    title: 'Entry 1',
  }
  const before = Date.now()

  const ret = createCast(shape, 'entry', schemas)(data, isRev) as TypedData

  const after = Date.now()
  assert.equal(ret.createdAt instanceof Date, true)
  assert.equal((ret.createdAt as Date).getTime() >= before, true)
  assert.equal((ret.createdAt as Date).getTime() <= after, true)
  assert.equal(ret.updatedAt, undefined)
})

test('should set only updatedAt if not set and present in schema', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
    updatedAt: { $type: 'date' },
  }
  const data = {
    id: 'ent1',
    title: 'Entry 1',
  }
  const before = Date.now()

  const ret = createCast(shape, 'entry', schemas)(data, isRev) as TypedData

  const after = Date.now()
  assert.equal(ret.updatedAt instanceof Date, true)
  assert.equal((ret.updatedAt as Date).getTime() >= before, true)
  assert.equal((ret.updatedAt as Date).getTime() <= after, true)
  assert.equal(ret.createdAt, undefined)
})

test('should set updatedAt equal to createdAt', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
    createdAt: { $type: 'date' },
    updatedAt: { $type: 'date' },
  }
  const data = {
    id: 'ent1',
    title: 'Entry 1',
    createdAt: new Date('2023-03-18T14:03:44Z'),
  }

  const ret = createCast(shape, 'entry', schemas)(data, isRev) as TypedData

  assert.deepEqual(ret.updatedAt, new Date('2023-03-18T14:03:44Z'))
  assert.deepEqual(ret.createdAt, new Date('2023-03-18T14:03:44Z'))
})

test('should set createdAt equal to updatedAt', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
    createdAt: { $type: 'date' },
    updatedAt: { $type: 'date' },
  }
  const data = {
    id: 'ent1',
    title: 'Entry 1',
    updatedAt: new Date('2023-03-18T17:15:18Z'),
  }

  const ret = createCast(shape, 'entry', schemas)(data, isRev) as TypedData

  assert.deepEqual(ret.createdAt, new Date('2023-03-18T17:15:18Z'))
  assert.deepEqual(ret.updatedAt, new Date('2023-03-18T17:15:18Z'))
})

test('should not set dates if not present in schema', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = {
    id: 'ent1',
    title: 'Entry 1',
  }

  const ret = createCast(shape, 'entry', schemas)(data, isRev) as TypedData

  assert.equal(ret.createdAt, undefined)
  assert.equal(ret.updatedAt, undefined)
})

test('should not set createdAt and updatedAt if already set', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
    createdAt: { $type: 'date' },
    updatedAt: { $type: 'date' },
  }
  const data = {
    id: 'ent1',
    title: 'Entry 1',
    createdAt: new Date('2023-03-18T14:03:44Z'),
    updatedAt: new Date('2023-03-18T17:15:18Z'),
  }

  const ret = createCast(shape, 'entry', schemas)(data, isRev) as TypedData

  assert.deepEqual(ret.createdAt, new Date('2023-03-18T14:03:44Z'))
  assert.deepEqual(ret.updatedAt, new Date('2023-03-18T17:15:18Z'))
})

test('should not use any defaults when noDefaults is true', () => {
  const noDefaults = true
  const isRev = false
  const doGenerateId = true
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
    age: { $type: 'integer', default: 0 },
    createdAt: { $type: 'date' },
    updatedAt: { $type: 'date' },
  }
  const data = { title: 'Entry 1' }

  const ret = createCast(
    shape,
    'entry',
    schemas,
    doGenerateId,
  )(data, isRev, noDefaults) as TypedData

  assert.equal(ret.id, null)
  assert.equal(ret.createdAt, undefined)
  assert.equal(ret.updatedAt, undefined)
  assert.equal(ret.age, undefined)
})

test('should still keep existing dates when noDefaults is true', () => {
  const noDefaults = true
  const isRev = false
  const doGenerateId = true
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
    age: { $type: 'integer', default: 0 },
    createdAt: { $type: 'date' },
    updatedAt: { $type: 'date' },
  }
  const createdAt = new Date()
  const updatedAt = new Date()
  const data = { title: 'Entry 1', createdAt, updatedAt }

  const ret = createCast(
    shape,
    'entry',
    schemas,
    doGenerateId,
  )(data, isRev, noDefaults) as TypedData

  assert.equal(ret.id, null)
  assert.deepEqual(ret.createdAt, createdAt)
  assert.deepEqual(ret.updatedAt, updatedAt)
  assert.equal(ret.age, undefined)
})

test('should skip properties with invalid $type', () => {
  const isRev = false
  const shape = expandShape({
    id: 'string',
    title: 'string',
    abstract: null,
    active: 1,
    author: { $type: 78 },
  } as unknown as ShapeDef)
  const data = [
    {
      id: 12345,
      title: 'Entry 1',
      abstract: 'The first entry',
      age: '180734118',
      active: true,
      author: 'johnf',
    },
  ]
  const expected = [
    {
      $type: 'entry',
      id: '12345',
      title: 'Entry 1',
    },
  ]

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should recast items already cast with another $type', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = [
    {
      $type: 'user',
      id: 'johnf',
      name: 'John F.',
    },
  ]
  const expected = [{ id: 'johnf', $type: 'entry' }]

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should pass on items already cast with this $type', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = [
    {
      $type: 'entry',
      id: 'ent1',
      title: 'Entry 1',
    },
  ]
  const expected = data

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should recast items already cast with another $type in reverse', () => {
  const isRev = true
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = [
    {
      $type: 'user',
      id: 'johnf',
      name: 'John F.',
    },
  ]
  const expected = [{ id: 'johnf' }]

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should not set $type when casting in reverse', () => {
  const isRev = true
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = [
    {
      $type: 'entry',
      id: 'ent1',
      title: 'Entry 1',
    },
  ]
  const expected = [
    {
      id: 'ent1',
      title: 'Entry 1',
    },
  ]

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should keep isNew and isDeleted when true', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = [
    {
      id: '12345',
      title: 'Entry 1',
      isNew: true,
      isDeleted: true,
    },
  ]
  const expected = [
    {
      $type: 'entry',
      id: '12345',
      title: 'Entry 1',
      isNew: true,
      isDeleted: true,
    },
  ]

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should remove isNew and isDeleted when false', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = [
    {
      id: '12345',
      title: 'Entry 1',
      isNew: false,
      isDeleted: false,
    },
  ]
  const expected = [
    {
      $type: 'entry',
      id: '12345',
      title: 'Entry 1',
    },
  ]

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should keep isNew and isDeleted when true in reverse', () => {
  const isRev = true
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = [
    {
      id: '12345',
      title: 'Entry 1',
      isNew: true,
      isDeleted: true,
    },
  ]
  const expected = [
    {
      id: '12345',
      title: 'Entry 1',
      isNew: true,
      isDeleted: true,
    },
  ]

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should remove isNew and isDeleted when false in reverse', () => {
  const isRev = true
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string' },
  }
  const data = [
    {
      id: '12345',
      title: 'Entry 1',
      isNew: false,
      isDeleted: false,
    },
  ]
  const expected = [
    {
      id: '12345',
      title: 'Entry 1',
    },
  ]

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should not cast null or undefined', () => {
  const isRev = false
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string', default: 'Entry with no name' },
  }
  const data = [null, undefined, { id: 'ent1' }]
  const expected = [
    {
      $type: 'entry',
      id: 'ent1',
      title: 'Entry with no name',
    },
  ]

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

test('should not cast null or undefined in reverse', () => {
  const isRev = true
  const shape = {
    id: { $type: 'string' },
    title: { $type: 'string', default: 'Entry with no name' },
  }
  const data = [null, undefined, { id: 'ent1' }]
  const expected = [
    {
      id: 'ent1',
      title: 'Entry with no name',
    },
  ]

  const ret = createCast(shape, 'entry', schemas)(data, isRev)

  assert.deepEqual(ret, expected)
})

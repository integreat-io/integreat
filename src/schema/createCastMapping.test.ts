import test from 'ava'
import { mapTransform } from 'map-transform'
import transformFunctions from '../transformers/builtIns'
import { TypedData } from '../types'

import createCastMapping from './createCastMapping'

test('should create mapping definition from schema', (t) => {
  const schema = {
    id: 'string',
    type: { $cast: 'string', $const: 'entry' },
    title: { $cast: 'string', $default: 'Entry with no name' },
    abstract: { $cast: 'string' },
    age: 'integer',
    long: 'float',
    lat: 'number',
    active: 'boolean',
    createdAt: 'date',
    author: 'user',
    comments: 'comment[]',
  }
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
      comments: [{ id: 'comment12', $ref: 'comment' }, { id: 'comment13' }],
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
      comments: [
        { id: 'comment12', $ref: 'comment' },
        { id: 'comment13', $ref: 'comment' },
      ],
    },
    {
      $type: 'entry',
      id: 'ent2',
      type: 'entry',
      title: 'Entry with no name',
      abstract: undefined,
      age: 244511383,
      long: undefined,
      lat: undefined,
      active: undefined,
      createdAt: new Date('2019-03-12T09:40:43Z'),
      author: { id: 'maryk', $ref: 'user' },
      comments: [{ id: 'comment23', $ref: 'comment' }],
    },
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  })(data)

  t.deepEqual(ret, expected)
})

test('should map props in given order', (t) => {
  const schema = {
    id: 'string',
    type: { $cast: 'string', $const: 'entry' },
    title: { $cast: 'string', $default: 'Entry with no name' },
    abstract: { $cast: 'string' },
    age: 'integer',
    long: 'float',
    lat: 'number',
    active: 'boolean',
    createdAt: 'date',
    author: 'user',
    comments: 'comment[]',
  }
  const data = {
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
    comments: [{ id: 'comment12', $ref: 'comment' }, { id: 'comment13' }],
  }
  const expectedProps = [
    '$type',
    'id',
    'type',
    'title',
    'abstract',
    'age',
    'long',
    'lat',
    'active',
    'createdAt',
    'author',
    'comments',
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  })(data)

  t.deepEqual(Object.keys(ret as object), expectedProps)
})

test('should reverse transform with mapping definition from schema', (t) => {
  const schema = {
    id: 'string',
    type: { $cast: 'string', $const: 'entry' },
    title: { $cast: 'string', $default: 'Entry with no name' },
    abstract: { $cast: 'string' },
    age: 'integer',
    long: 'float',
    lat: 'number',
    active: 'boolean',
    createdAt: 'date',
    author: 'user',
    comments: 'comment[]',
  }
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
      author: { id: 'johnf', $ref: 'user' },
      comments: [
        { id: 'comment12', $ref: 'comment' },
        { id: 'comment13', $ref: 'comment' },
      ],
    },
    {
      id: 'ent2',
      title: 'Entry with no name',
      type: 'entry',
      abstract: undefined,
      age: 244511383,
      long: undefined,
      lat: undefined,
      active: undefined,
      createdAt: new Date('2019-03-12T09:40:43Z'),
      author: { id: 'maryk', $ref: 'user' },
      comments: [{ id: 'comment23', $ref: 'comment' }],
    },
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  }).rev(data)

  t.deepEqual(ret, expected)
})

test('should be iteratable', (t) => {
  const schema = {
    id: 'string',
    title: 'string',
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

  const ret = mapTransform([createCastMapping(schema, 'entry')], {
    functions: transformFunctions,
  })(data)

  t.deepEqual(ret, expected)
})

test('should create mapping definition from nested schema', (t) => {
  const schema = {
    id: 'string',
    type: { $cast: 'string', $const: 'entry' },
    attributes: {
      title: { $cast: 'string', $default: 'Entry with no name' },
      age: 'integer',
    },
    relationships: {
      author: 'user',
      comments: 'comment[]',
    },
  }
  const data = [
    {
      id: 12345,
      type: 'entry',
      attributes: { title: 'Entry 1', age: '180734118' },
      relationships: {
        author: { id: 'johnf', $ref: 'user' },
        comments: [
          { id: 'comment12', $ref: 'comment' },
          { id: 'comment13', $ref: 'comment' },
        ],
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
  ]
  const expected = [
    {
      $type: 'entry',
      id: '12345',
      type: 'entry',
      attributes: { title: 'Entry 1', age: 180734118 },
      relationships: {
        author: { id: 'johnf', $ref: 'user' },
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
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  })(data)

  t.deepEqual(ret, expected)
})

test('should skip properties with invalid $cast', (t) => {
  const schema = {
    id: 'string',
    title: 'string',
    abstract: null,
    age: undefined,
    active: 1,
    author: { $cast: 78 },
  }
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ret = mapTransform(createCastMapping(schema as any, 'entry'), {
    functions: transformFunctions,
  })(data)

  t.deepEqual(ret, expected)
})

test('should skip items already cast with another $type', (t) => {
  const schema = {
    id: 'string',
    title: 'string',
  }
  const data = [
    {
      $type: 'user',
      id: 'johnf',
      name: 'John F.',
    },
  ]
  const expected = [] as TypedData[]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  })(data)

  t.deepEqual(ret, expected)
})

test('should pass on items already cast with this $type', (t) => {
  const schema = {
    id: 'string',
    title: 'string',
  }
  const data = [
    {
      $type: 'entry',
      id: 'ent1',
      title: 'Entry 1',
    },
  ]
  const expected = data

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  })(data)

  t.deepEqual(ret, expected)
})

test('should skip items already cast with another $type in reverse', (t) => {
  const schema = {
    id: 'string',
    title: 'string',
  }
  const data = [
    {
      $type: 'user',
      id: 'johnf',
      name: 'John F.',
    },
  ]
  const expected = [] as TypedData[]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  }).rev(data)

  t.deepEqual(ret, expected)
})

test('should remove $type when casting in reverse', (t) => {
  const schema = {
    id: 'string',
    title: 'string',
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

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  }).rev(data)

  t.deepEqual(ret, expected)
})

test('should keep isNew and isDeleted when true', (t) => {
  const schema = {
    id: 'string',
    title: 'string',
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

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  })(data)

  t.deepEqual(ret, expected)
})

test('should remove isNew and isDeleted when false', (t) => {
  const schema = {
    id: 'string',
    title: 'string',
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

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  })(data)

  t.deepEqual(ret, expected)
})

test('should keep isNew and isDeleted when true in reverse', (t) => {
  const schema = {
    id: 'string',
    title: 'string',
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

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  }).rev(data)

  t.deepEqual(ret, expected)
})

test('should remove isNew and isDeleted when false in reverse', (t) => {
  const schema = {
    id: 'string',
    title: 'string',
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

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  }).rev(data)

  t.deepEqual(ret, expected)
})

test('should not cast null or undefined', (t) => {
  const schema = {
    id: 'string',
    title: { $cast: 'string', $default: 'Entry with no name' },
  }
  const data = [null, undefined, { id: 'ent1' }]
  const expected = [
    {
      $type: 'entry',
      id: 'ent1',
      title: 'Entry with no name',
    },
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  })(data)

  t.deepEqual(ret, expected)
})

test('should not cast null or undefined in reverse', (t) => {
  const schema = {
    id: 'string',
    title: { $cast: 'string', $default: 'Entry with no name' },
  }
  const data = [null, undefined, { id: 'ent1' }]
  const expected = [
    {
      id: 'ent1',
      title: 'Entry with no name',
    },
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions,
  }).rev(data)

  t.deepEqual(ret, expected)
})

test.todo('should have some more error checking, probably')

import test from 'ava'
import { mapTransform, MapDefinition } from 'map-transform'
import transformers from '../transformers/builtIns/index.js'

import createCastMapping from './createCastMapping.js'

// Tests

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
    payload: 'object',
    data: 'unknown',
    comments: 'comment[]',
    'props[]': {
      key: 'string',
      value: 'string',
    },
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
      abstract: undefined,
      age: 244511383,
      long: undefined,
      lat: undefined,
      active: undefined,
      createdAt: new Date('2019-03-12T09:40:43Z'),
      author: { id: 'maryk', $ref: 'user' },
      payload: undefined,
      data: undefined,
      comments: [{ id: 'comment23', $ref: 'comment' }],
      props: undefined,
    },
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    transformers,
  })(data)

  t.deepEqual(ret, expected)
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
    comments: 'comment[]',
    createdAt: 'date',
    author: 'user',
    payload: 'object',
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
      payload: { type: 'entry', data: [{ id: 'ent1', $type: 'entry' }] },
      comments: ['comment12', { id: 'comment13', $ref: 'comment' }],
    },
    {
      $type: 'entry',
      id: 'ent2',
      age: 244511383,
      createdAt: new Date('2019-03-12T09:40:43Z'),
      author: { id: 'maryk' },
      payload: undefined,
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
      type: 'entry',
      abstract: undefined,
      age: 244511383,
      long: undefined,
      lat: undefined,
      active: undefined,
      createdAt: new Date('2019-03-12T09:40:43Z'),
      author: { id: 'maryk' },
      payload: undefined,
      comments: [{ id: 'comment23' }],
    },
    {
      id: 'ent3',
      title: 'Entry with no name',
      type: 'entry',
      abstract: undefined,
      age: 180735220,
      long: undefined,
      lat: undefined,
      active: undefined,
      createdAt: new Date('2019-03-18T05:14:59Z'),
      author: { id: 'whatson' },
      payload: undefined,
      comments: undefined,
    },
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    transformers,
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

  const ret = mapTransform(
    [createCastMapping(schema, 'entry')] as MapDefinition,
    {
      transformers,
    }
  )(data)

  t.deepEqual(ret, expected)
})

test('should cast non-primitive fields with schema', (t) => {
  const entrySchema = {
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
  const userSchema = {
    id: 'string',
    name: 'string',
  }
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
      relationships: { author: undefined, comments: undefined },
    },
  ]

  const ret = mapTransform(createCastMapping(entrySchema, 'entry'), {
    transformers,
    pipelines: {
      cast_user: createCastMapping(userSchema, 'user'),
    },
  })(data)

  t.deepEqual(ret, expected)
})

test('should cast non-primitive fields with schema in reverse', (t) => {
  const entrySchema = {
    id: 'string',
    type: { $cast: 'string', $const: 'entry' },
    attributes: {
      title: { $cast: 'string', $default: 'Entry with no name' },
      age: 'integer',
    },
    relationships: {
      comments: 'comment[]',
      author: 'user',
    },
  }
  const userSchema = {
    id: 'string',
    name: 'string',
  }
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
      relationships: { author: undefined, comments: undefined },
    },
  ]

  const ret = mapTransform(createCastMapping(entrySchema, 'entry'), {
    transformers,
    pipelines: {
      cast_user: createCastMapping(userSchema, 'user'),
    },
  }).rev(data)

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
    transformers,
  })(data)

  t.deepEqual(ret, expected)
})

test('should recast items already cast with another $type', (t) => {
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
  const expected = [{ id: 'johnf', $type: 'entry', title: undefined }]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    transformers,
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
    transformers,
  })(data)

  t.deepEqual(ret, expected)
})

test('should recast items already cast with another $type in reverse', (t) => {
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
  const expected = [{ id: 'johnf', title: undefined }]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    transformers,
  }).rev(data)

  t.deepEqual(ret, expected)
})

test('should not set $type when casting in reverse', (t) => {
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
    transformers,
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
    transformers,
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
    transformers,
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
    transformers,
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
    transformers,
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
    transformers,
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
    transformers,
  }).rev(data)

  t.deepEqual(ret, expected)
})

test.todo('should have some more error checking, probably')

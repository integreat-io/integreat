import test from 'ava'
import { mapTransform } from 'map-transform'
import transformFunctions from '../transformers/builtIns'

import createCastMapping from './createCastMapping'

test('should create mapping definition from schema', t => {
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
    comments: 'comment[]'
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
      comments: [{ id: 'comment12', $ref: 'comment' }, { id: 'comment13' }]
    },
    {
      id: 'ent2',
      age: 244511383,
      createdAt: new Date('2019-03-12T09:40:43Z'),
      author: 'maryk',
      comments: 'comment23'
    }
  ]
  const expected = [
    {
      $schema: 'entry',
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
        { id: 'comment13', $ref: 'comment' }
      ]
    },
    {
      $schema: 'entry',
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
      comments: [{ id: 'comment23', $ref: 'comment' }]
    }
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions
  })(data)

  t.deepEqual(ret, expected)
})

test('should map props in given order', t => {
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
    comments: 'comment[]'
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
    comments: [{ id: 'comment12', $ref: 'comment' }, { id: 'comment13' }]
  }
  const expectedProps = [
    '$schema',
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
    'comments'
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions
  })(data)

  t.deepEqual(Object.keys(ret as object), expectedProps)
})

test('should reverse transform with mapping definition from schema', t => {
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
    comments: 'comment[]'
  }
  const data = [
    {
      $schema: 'entry',
      id: 12345,
      type: 'unknown',
      title: 'Entry 1',
      abstract: 'The first entry',
      age: '180734118',
      long: '60.382732',
      lat: '5.326373',
      active: 'true',
      createdAt: '2019-03-11T18:43:09Z',
      author: { id: 'johnf', $ref: 'user' },
      comments: [
        { id: 'comment12', $ref: 'comment' },
        { id: 'comment13', $ref: 'comment' }
      ]
    },
    {
      $schema: 'entry',
      id: 'ent2',
      age: 244511383,
      createdAt: new Date('2019-03-12T09:40:43Z'),
      author: { id: 'maryk', $ref: 'user' },
      comments: [{ id: 'comment23', $ref: 'comment' }]
    }
  ]
  const expected = [
    {
      $schema: 'entry',
      id: '12345',
      type: 'entry',
      title: 'Entry 1',
      abstract: 'The first entry',
      age: 180734118,
      long: 60.382732,
      lat: 5.326373,
      active: true,
      createdAt: new Date('2019-03-11T18:43:09Z'),
      author: 'johnf',
      comments: ['comment12', 'comment13']
    },
    {
      $schema: 'entry',
      id: 'ent2',
      title: 'Entry with no name',
      type: 'entry',
      abstract: undefined,
      age: 244511383,
      long: undefined,
      lat: undefined,
      active: undefined,
      createdAt: new Date('2019-03-12T09:40:43Z'),
      author: 'maryk',
      comments: ['comment23']
    }
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions
  }).rev(data)

  t.deepEqual(ret, expected)
})

test('should be iteratable', t => {
  const schema = {
    id: 'string',
    title: 'string'
  }
  const data = [
    {
      id: 1,
      title: 'Entry 1'
    },
    {
      id: 2,
      title: 'Entry 2'
    }
  ]
  const expected = [
    {
      $schema: 'entry',
      id: '1',
      title: 'Entry 1'
    },
    {
      $schema: 'entry',
      id: '2',
      title: 'Entry 2'
    }
  ]

  const ret = mapTransform([createCastMapping(schema, 'entry')], {
    functions: transformFunctions
  })(data)

  t.deepEqual(ret, expected)
})

test('should create mapping definition from nested schema', t => {
  const schema = {
    id: 'string',
    type: { $cast: 'string', $const: 'entry' },
    attributes: {
      title: { $cast: 'string', $default: 'Entry with no name' },
      age: 'integer'
    },
    relationships: {
      author: 'user',
      comments: 'comment[]'
    }
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
          { id: 'comment13', $ref: 'comment' }
        ],
        unknown: 'Drop this'
      }
    },
    {
      id: 'ent2',
      attributes: { age: 244511383 },
      relationships: {
        author: 'maryk',
        comments: 'comment23'
      }
    }
  ]
  const expected = [
    {
      $schema: 'entry',
      id: '12345',
      type: 'entry',
      attributes: { title: 'Entry 1', age: 180734118 },
      relationships: {
        author: { id: 'johnf', $ref: 'user' },
        comments: [
          { id: 'comment12', $ref: 'comment' },
          { id: 'comment13', $ref: 'comment' }
        ]
      }
    },
    {
      $schema: 'entry',
      id: 'ent2',
      type: 'entry',
      attributes: { title: 'Entry with no name', age: 244511383 },
      relationships: {
        author: { id: 'maryk', $ref: 'user' },
        comments: [{ id: 'comment23', $ref: 'comment' }]
      }
    }
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions
  })(data)

  t.deepEqual(ret, expected)
})

test('should skip properties with invalid $cast', t => {
  const schema = {
    id: 'string',
    title: 'string',
    abstract: null as any,
    age: undefined as any,
    active: 1 as any,
    author: { $cast: 78 } as any
  }
  const data = [
    {
      id: 12345,
      title: 'Entry 1',
      abstract: 'The first entry',
      age: '180734118',
      active: true,
      author: 'johnf'
    }
  ]
  const expected = [
    {
      $schema: 'entry',
      id: '12345',
      title: 'Entry 1'
    }
  ]

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions
  })(data)

  t.deepEqual(ret, expected)
})

test('should skip items already cast with another $schema', t => {
  const schema = {
    id: 'string',
    title: 'string'
  }
  const data = [
    {
      $schema: 'user',
      id: 'johnf',
      name: 'John F.'
    }
  ]
  const expected = []

  const ret = mapTransform(createCastMapping(schema, 'entry'), {
    functions: transformFunctions
  })(data)

  t.deepEqual(ret, expected)
})

test.todo('should have some more error checking, probably')
test.todo('cast should keep isNew when true')
test.todo('cast should keep isDeleted when true')
test.todo('cast should remove isTrue and isDeleted when false')
test.todo('cast should generate random id')
test.todo('should set default createdAt and upatedAt')

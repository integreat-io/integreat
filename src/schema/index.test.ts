import test from 'ava'
import mapTransform from 'map-transform'
import transformers from '../transformers/builtIns/index.js'
import user from '../tests/helpers/defs/schemas/user.js'
import comment from '../tests/helpers/defs/schemas/comment.js'
import type { TypedData } from '../types.js'

import createSchema from './index.js'

// Tests

test('should set up schema', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      attributes: {
        title: 'string',
        text: { $cast: 'string' },
        age: 'integer',
      },
      relationships: {
        author: 'user',
        comments: { $cast: 'comment' },
      },
    },
    access: 'auth',
  }
  const expectedAttributes = {
    title: { $cast: 'string' },
    text: { $cast: 'string' },
    age: { $cast: 'integer' },
  }
  const expectedRelationships = {
    author: { $cast: 'user' },
    comments: { $cast: 'comment' },
  }

  const ret = createSchema(def)

  t.truthy(ret)
  t.is(ret.id, 'entry')
  t.is(ret.plural, 'entries')
  t.is(ret.service, 'entries')
  t.is(ret.access, 'auth')
  t.false(ret.internal)
  t.truthy(ret.shape)
  t.deepEqual(ret.shape.attributes, expectedAttributes)
  t.deepEqual(ret.shape.relationships, expectedRelationships)
})

test('should provide accessForAction method', (t) => {
  const def = {
    id: 'entry',
    shape: {
      title: 'string',
    },
    access: { allow: 'all', actions: { SET: 'auth' } },
  }

  const ret = createSchema(def)

  t.is(typeof ret.accessForAction, 'function')
  t.deepEqual(ret.accessForAction('GET'), { allow: 'all' })
  t.deepEqual(ret.accessForAction('SET'), { allow: 'auth' })
})

test('should set internal prop', (t) => {
  const def = {
    id: 'entry',
    service: 'entries',
    internal: true,
  }

  const ret = createSchema(def)

  t.true(ret.internal)
})

test('should infer plural when not set', (t) => {
  const type = {
    id: 'article',
    shape: {},
  }

  const ret = createSchema(type)

  t.is(ret.id, 'article')
  t.is(ret.plural, 'articles')
})

test('should always include id in schema', (t) => {
  const schema = {
    id: 'entry',
    service: 'entries',
    shape: {},
  }
  const expected = {
    id: { $cast: 'string', $default: null },
  }

  const ret = createSchema(schema)

  t.deepEqual(ret.shape, expected)
})

test('should override base fields in definition', (t) => {
  const type = {
    id: 'entry',
    service: 'entries',
    shape: {
      id: 'date',
      createdAt: 'boolean',
      updatedAt: 'boolean',
    },
  }
  const expected = {
    id: { $cast: 'string', $default: null },
    createdAt: { $cast: 'date' },
    updatedAt: { $cast: 'date' },
  }

  const ret = createSchema(type)

  t.deepEqual(ret.shape, expected)
})

// Tests -- cast mutation

test('should provide cast mutation', (t) => {
  const date = new Date('2019-01-18T03:43:52Z')
  const entrySchema = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      title: { $cast: 'string', $default: 'Entry with no name' },
      text: 'string',
      age: { $cast: 'integer' },
      createdAt: 'date',
      updatedAt: 'date',
    },
    access: 'auth',
  }
  const data = [
    {
      id: 12345,
      age: '244511383',
      text: 'The first entry',
      createdAt: date,
      updatedAt: date,
    },
  ]
  const expected = [
    {
      id: '12345',
      $type: 'entry',
      title: 'Entry with no name',
      text: 'The first entry',
      age: 244511383,
      createdAt: date,
      updatedAt: date,
    },
  ]
  const expectedOrder = [
    'id',
    '$type',
    'title',
    'text',
    'age',
    'createdAt',
    'updatedAt',
  ]

  const mapping = createSchema(entrySchema).mapping
  const ret = mapTransform(mapping, { transformers })(data) as Record<
    string,
    unknown
  >[]

  t.deepEqual(ret, expected)
  t.deepEqual(Object.keys(ret[0]), expectedOrder)
})

test('should not include dates by default', (t) => {
  const entrySchema = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      title: { $cast: 'string', $default: 'Entry with no name' },
    },
    access: 'auth',
  }
  const data = {
    id: 12345,
    text: 'The first entry',
  }
  const expected = {
    id: '12345',
    $type: 'entry',
    title: 'Entry with no name',
  }

  const mapping = createSchema(entrySchema).mapping
  const ret = mapTransform(mapping, { transformers })(data) as Record<
    string,
    unknown
  >[]

  t.deepEqual(ret, expected)
})

test('should provide cast mutation with sub schemas', (t) => {
  const date = new Date('2019-01-18T03:43:52Z')
  const entrySchema = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      title: { $cast: 'string', $default: 'Entry with no name' },
      text: 'string',
      age: { $cast: 'integer' },
      author: 'user',
      comments: { $cast: 'comment[]' },
    },
    access: 'auth',
  }
  const pipelines = {
    cast_user: createSchema(user).mapping,
    cast_comment: createSchema(comment).mapping,
  }
  const data = [
    {
      id: 12345,
      age: '244511383',
      text: 'The first entry',
      createdAt: date,
      updatedAt: date,
      author: 'maryk',
      comments: 'comment23',
    },
  ]
  const expectedAuthor = { id: 'maryk', $ref: 'user' }
  const expectedComments = [{ id: 'comment23', $ref: 'comment' }]

  const mapping = createSchema(entrySchema).mapping
  const ret = mapTransform(mapping, { transformers, pipelines })(
    data
  ) as Record<string, unknown>[]

  t.deepEqual(ret[0].author, expectedAuthor)
  t.deepEqual(ret[0].comments, expectedComments)
})

test('should set createdAt and updatedAt to now when not set', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      id: 'string',
      title: 'string',
      createdAt: 'date',
      updatedAt: 'date',
    },
  }
  const data = {
    id: 12345,
    title: 'Entry 1',
  }
  const before = Date.now()

  const mapping = createSchema(def).mapping
  const ret = mapTransform(mapping, { transformers })(data)

  const after = Date.now()
  const { createdAt, updatedAt } = ret as TypedData
  t.true(createdAt instanceof Date)
  t.true(updatedAt instanceof Date)
  t.true((createdAt as Date).getTime() >= before)
  t.true((createdAt as Date).getTime() <= after)
  t.true((updatedAt as Date).getTime() >= before)
  t.true((updatedAt as Date).getTime() <= after)
})

test('should cast id to string', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      id: 'string',
      title: 'string',
    },
  }
  const data = {
    id: 35,
    title: 'Entry 1',
  }

  const mapping = createSchema(def).mapping
  const ret = mapTransform(mapping, { transformers })(data)

  const { id } = ret as TypedData
  t.is(id, '35')
})

test('should set missing id to null', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      id: 'string',
      title: 'string',
    },
  }
  const data = {
    title: 'Entry 1',
  }

  const mapping = createSchema(def).mapping
  const ret = mapTransform(mapping, { transformers })(data)

  const { id } = ret as TypedData
  t.is(id, null)
})

test('should generate id when not set and generateId is true', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    generateId: true,
    shape: {
      id: 'string',
      title: 'string',
    },
  }
  const data = {
    title: 'Entry 1',
  }

  const mapping = createSchema(def).mapping
  const ret = mapTransform(mapping, { transformers })(data)

  const { id } = ret as TypedData
  t.is(typeof id, 'string')
  t.true((id as string).length >= 21)
})

test('should not cast undefined', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      title: { $cast: 'string', $default: 'Entry with no name' },
    },
    access: 'auth',
  }
  const data = undefined
  const expected = undefined

  const mapping = createSchema(def).mapping
  const ret = mapTransform(mapping, { transformers })(data)

  t.deepEqual(ret, expected)
})

test('should not cast null', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      title: { $cast: 'string', $default: 'Entry with no name' },
    },
    access: 'auth',
  }
  const data = null
  const expected = undefined

  const mapping = createSchema(def).mapping
  const ret = mapTransform(mapping, { transformers })(data)

  t.deepEqual(ret, expected)
})

test('should not cast undefined in array', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      title: { $cast: 'string', $default: 'Entry with no name' },
    },
    access: 'auth',
  }
  const data = [undefined, { id: 12345 }]
  const expected = [
    {
      $type: 'entry',
      id: '12345',
      title: 'Entry with no name',
    },
  ]

  const mapping = createSchema(def).mapping
  const ret = mapTransform(mapping, { transformers })(data)

  t.deepEqual(ret, expected)
})

test('should not return array when expecting value', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      id: 'string',
      title: 'string',
    },
  }
  const data = {
    id: '35',
    title: ['Entry 1', 'Entry 2'],
  }

  const mapping = createSchema(def).mapping
  const ret = mapTransform(mapping, { transformers })(data)

  const { title } = ret as TypedData
  t.is(title, undefined)
})

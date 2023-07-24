import test from 'ava'
import userSchema from '../tests/helpers/defs/schemas/user.js'
import commentSchema from '../tests/helpers/defs/schemas/comment.js'
import type { TypedData } from '../types.js'

import Schema from './Schema.js'

// Setup

const castFns = new Map()

// Tests

test('should set up schema', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      attributes: {
        title: 'string',
        text: { $type: 'string' },
        age: 'integer',
      },
      relationships: {
        author: 'user',
        comments: { $type: 'comment' },
      },
    },
    access: 'auth',
  }
  const expectedAttributes = {
    title: { $type: 'string' },
    text: { $type: 'string' },
    age: { $type: 'integer' },
  }
  const expectedRelationships = {
    author: { $type: 'user' },
    comments: { $type: 'comment' },
  }

  const ret = new Schema(def, castFns)

  t.truthy(ret)
  t.is(ret.id, 'entry')
  t.is(ret.plural, 'entries')
  t.is(ret.service, 'entries')
  t.deepEqual(ret.access, { allow: 'auth' })
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

  const ret = new Schema(def, castFns)

  t.is(typeof ret.accessForAction, 'function')
  t.deepEqual(ret.accessForAction('GET'), { allow: 'all' })
  t.deepEqual(ret.accessForAction('SET'), { allow: 'auth' })
  t.deepEqual(ret.access, { allow: 'all', actions: { SET: 'auth' } })
})

test('should set internal prop', (t) => {
  const def = {
    id: 'entry',
    service: 'entries',
    internal: true,
  }

  const ret = new Schema(def, castFns)

  t.true(ret.internal)
})

test('should infer plural when not set', (t) => {
  const def = {
    id: 'article',
    shape: {},
  }

  const ret = new Schema(def, castFns)

  t.is(ret.id, 'article')
  t.is(ret.plural, 'articles')
})

test('should always include id in schema', (t) => {
  const def = {
    id: 'entry',
    service: 'entries',
    shape: {},
  }
  const expected = {
    id: { $type: 'string' },
  }

  const ret = new Schema(def, castFns)

  t.deepEqual(ret.shape, expected)
})

test('should throw when base fields are provided with the wrong type', (t) => {
  const def = {
    id: 'entry',
    service: 'entries',
    shape: {
      id: 'date',
      createdAt: 'boolean',
      updatedAt: 'boolean',
    },
  }

  const error = t.throws(() => new Schema(def, castFns))

  t.true(error instanceof Error)
  t.is(
    error?.message,
    "'id' must be a string. 'createdAt' must be a date. 'updatedAt' must be a date"
  )
})

// Tests -- cast mutation

test('should provide cast mutation', (t) => {
  const date = new Date('2019-01-18T03:43:52Z')
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      title: { $type: 'string', default: 'Entry with no name' },
      text: 'string',
      age: { $type: 'integer' },
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

  const schema = new Schema(def, castFns)
  const ret = schema.castFn(data)

  t.deepEqual(ret, expected)
})

test('should not include dates by default', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      title: { $type: 'string', default: 'Entry with no name' },
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

  const schema = new Schema(def, castFns)
  const ret = schema.castFn(data)

  t.deepEqual(ret, expected)
})

test('should provide map with other cast function', (t) => {
  const date = new Date('2019-01-18T03:43:52Z')
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      title: { $type: 'string', default: 'Entry with no name' },
      text: 'string',
      age: { $type: 'integer' },
      author: 'user',
      comments: { $type: 'comment[]' },
    },
    access: 'auth',
  }
  const castFns = new Map()
  castFns.set('user', new Schema(userSchema, castFns).castFn)
  castFns.set('comment', new Schema(commentSchema, castFns).castFn)
  const data = [
    {
      id: 12345,
      age: '244511383',
      text: 'The first entry',
      createdAt: date,
      updatedAt: date,
      author: { id: 'maryk', firstname: 'Mary' },
      comments: 'comment23',
    },
  ]
  const expectedComments = [{ id: 'comment23', $ref: 'comment' }]

  const schema = new Schema(def, castFns)
  const ret = schema.castFn(data) as TypedData[]

  const author = ret[0].author as TypedData
  t.deepEqual(author.$type, 'user')
  t.deepEqual(author.id, 'maryk')
  t.deepEqual(author.firstname, 'Mary')
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

  const schema = new Schema(def, castFns)
  const ret = schema.castFn(data)

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

  const schema = new Schema(def, castFns)
  const ret = schema.castFn(data)

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

  const schema = new Schema(def, castFns)
  const ret = schema.castFn(data)

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

  const schema = new Schema(def, castFns)
  const ret = schema.castFn(data)

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
      title: { $type: 'string', default: 'Entry with no name' },
    },
    access: 'auth',
  }
  const data = undefined
  const expected = undefined

  const schema = new Schema(def, castFns)
  const ret = schema.castFn(data)

  t.deepEqual(ret, expected)
})

test('should not cast null', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      title: { $type: 'string', default: 'Entry with no name' },
    },
    access: 'auth',
  }
  const data = null
  const expected = undefined

  const schema = new Schema(def, castFns)
  const ret = schema.castFn(data)

  t.deepEqual(ret, expected)
})

test('should not cast undefined in array', (t) => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      title: { $type: 'string', default: 'Entry with no name' },
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

  const schema = new Schema(def, castFns)
  const ret = schema.castFn(data)

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

  const schema = new Schema(def, castFns)
  const ret = schema.castFn(data)

  const { title } = ret as TypedData
  t.is(title, undefined)
})

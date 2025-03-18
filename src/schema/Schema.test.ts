import test from 'node:test'
import assert from 'node:assert/strict'
import userSchema from '../tests/helpers/defs/schemas/user.js'
import commentSchema from '../tests/helpers/defs/schemas/comment.js'
import type { TypedData } from '../types.js'

import Schema from './Schema.js'

// Setup

const schemas = new Map()

// Tests

test('should set up schema', () => {
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

  const ret = new Schema(def, schemas)

  assert.equal(ret.id, 'entry')
  assert.equal(ret.plural, 'entries')
  assert.equal(ret.service, 'entries')
  assert.deepEqual(ret.access, { allow: 'auth' })
  assert.equal(ret.internal, false)
  assert.equal(!!ret.shape, true)
  assert.deepEqual(ret.shape.attributes, expectedAttributes)
  assert.deepEqual(ret.shape.relationships, expectedRelationships)
})

test('should provide accessForAction method', () => {
  const def = {
    id: 'entry',
    shape: {
      title: 'string',
    },
    access: { allow: 'all', actions: { SET: 'auth' } },
  }

  const ret = new Schema(def, schemas)

  assert.equal(typeof ret.accessForAction, 'function')
  assert.deepEqual(ret.accessForAction('GET'), { allow: 'all' })
  assert.deepEqual(ret.accessForAction('SET'), { allow: 'auth' })
  assert.deepEqual(ret.access, { allow: 'all', actions: { SET: 'auth' } })
})

test('should set internal prop', () => {
  const def = {
    id: 'entry',
    service: 'entries',
    internal: true,
  }

  const ret = new Schema(def, schemas)

  assert.equal(ret.internal, true)
})

test('should infer plural when not set', () => {
  const def = {
    id: 'article',
    shape: {},
  }

  const ret = new Schema(def, schemas)

  assert.equal(ret.id, 'article')
  assert.equal(ret.plural, 'articles')
})

test('should always include id in schema', () => {
  const def = {
    id: 'entry',
    service: 'entries',
    shape: {},
  }
  const expected = {
    id: { $type: 'string' },
  }

  const ret = new Schema(def, schemas)

  assert.deepEqual(ret.shape, expected)
})

test('should throw when base fields are provided with the wrong type', () => {
  const def = {
    id: 'entry',
    service: 'entries',
    shape: {
      id: 'date',
      createdAt: 'boolean',
      updatedAt: 'boolean',
    },
  }
  const expectedError = {
    name: 'Error',
    message:
      "'id' must be a string. 'createdAt' must be a date. 'updatedAt' must be a date",
  }

  assert.throws(() => new Schema(def, schemas), expectedError)
})

// Tests -- cast mutation

test('should provide cast mutation', () => {
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

  const schema = new Schema(def, schemas)
  const ret = schema.castFn(data)

  assert.deepEqual(ret, expected)
})

test('should not include dates by default', () => {
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

  const schema = new Schema(def, schemas)
  const ret = schema.castFn(data)

  assert.deepEqual(ret, expected)
})

test('should provide map with other cast function', () => {
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
  const schemas = new Map()
  schemas.set('user', new Schema(userSchema, schemas))
  schemas.set('comment', new Schema(commentSchema, schemas))
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

  const schema = new Schema(def, schemas)
  const ret = schema.castFn(data) as TypedData[]

  const author = ret[0].author as TypedData
  assert.deepEqual(author.$type, 'user')
  assert.deepEqual(author.id, 'maryk')
  assert.deepEqual(author.firstname, 'Mary')
  assert.deepEqual(ret[0].comments, expectedComments)
})

test('should set createdAt and updatedAt to now when not set', () => {
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

  const schema = new Schema(def, schemas)
  const ret = schema.castFn(data)

  const after = Date.now()
  const { createdAt, updatedAt } = ret as TypedData
  assert.equal(createdAt instanceof Date, true)
  assert.equal(updatedAt instanceof Date, true)
  assert.equal((createdAt as Date).getTime() >= before, true)
  assert.equal((createdAt as Date).getTime() <= after, true)
  assert.equal((updatedAt as Date).getTime() >= before, true)
  assert.equal((updatedAt as Date).getTime() <= after, true)
})

test('should cast id to string', () => {
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

  const schema = new Schema(def, schemas)
  const ret = schema.castFn(data)

  const { id } = ret as TypedData
  assert.equal(id, '35')
})

test('should set missing id to null', () => {
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

  const schema = new Schema(def, schemas)
  const ret = schema.castFn(data)

  const { id } = ret as TypedData
  assert.equal(id, null)
})

test('should generate id when not set and generateId is true', () => {
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

  const schema = new Schema(def, schemas)
  const ret = schema.castFn(data)

  const { id } = ret as TypedData
  assert.equal(typeof id, 'string')
  assert.match(id as string, /^[A-Za-z0-9_-]{21}$/)
})

test('should not cast undefined', () => {
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

  const schema = new Schema(def, schemas)
  const ret = schema.castFn(data)

  assert.deepEqual(ret, expected)
})

test('should not cast null', () => {
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

  const schema = new Schema(def, schemas)
  const ret = schema.castFn(data)

  assert.deepEqual(ret, expected)
})

test('should not cast undefined in array', () => {
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

  const schema = new Schema(def, schemas)
  const ret = schema.castFn(data)

  assert.deepEqual(ret, expected)
})

test('should not return array when expecting value', () => {
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

  const schema = new Schema(def, schemas)
  const ret = schema.castFn(data)

  const { title } = ret as TypedData
  assert.equal(title, undefined)
})

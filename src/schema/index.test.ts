import test from 'ava'
import { mapTransform } from 'map-transform'
import builtIns from '../transformers/builtIns'
import { DataObject } from '../types'

import schema from '.'

// Tests

test('should setup schema', (t) => {
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

  const ret = schema(def)

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

  const ret = schema(def)

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

  const ret = schema(def)

  t.true(ret.internal)
})

test('should infer plural when not set', (t) => {
  const type = {
    id: 'article',
    shape: {},
  }

  const ret = schema(type)

  t.is(ret.id, 'article')
  t.is(ret.plural, 'articles')
})

test('should include base fields', (t) => {
  const type = {
    id: 'entry',
    service: 'entries',
    shape: {},
  }
  const expected = {
    id: { $cast: 'string' },
    createdAt: { $cast: 'date' },
    updatedAt: { $cast: 'date' },
  }

  const ret = schema(type)

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
    id: { $cast: 'string' },
    createdAt: { $cast: 'date' },
    updatedAt: { $cast: 'date' },
  }

  const ret = schema(type)

  t.deepEqual(ret.shape, expected)
})

// Tests -- cast mapping

test('should provide cast mapping', (t) => {
  const date = new Date('2019-01-18T03:43:52Z')
  const def = {
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
  const expected = [
    {
      $type: 'entry',
      id: '12345',
      title: 'Entry with no name',
      text: 'The first entry',
      age: 244511383,
      createdAt: date,
      updatedAt: date,
      author: { id: 'maryk', $ref: 'user' },
      comments: [{ id: 'comment23', $ref: 'comment' }],
    },
  ]

  const mapping = schema(def).mapping
  const ret = mapTransform(mapping, { functions: builtIns })(data)

  t.deepEqual(ret, expected)
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

  const mapping = schema(def).mapping
  const ret = mapTransform(mapping, { functions: builtIns })(data)

  const after = Date.now()
  const { createdAt, updatedAt } = ret as DataObject
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

  const mapping = schema(def).mapping
  const ret = mapTransform(mapping, { functions: builtIns })(data)

  const { id } = ret as DataObject
  t.is(id, '35')
})

test('should generate id when not set', (t) => {
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

  const mapping = schema(def).mapping
  const ret = mapTransform(mapping, { functions: builtIns })(data)

  const { id } = ret as DataObject
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

  const mapping = schema(def).mapping
  const ret = mapTransform(mapping, { functions: builtIns })(data)

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

  const mapping = schema(def).mapping
  const ret = mapTransform(mapping, { functions: builtIns })(data)

  t.deepEqual(ret, expected)
})

test('should not cast undefined in array', (t) => {
  const date = new Date('2019-01-18T03:43:52Z')
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    shape: {
      title: { $cast: 'string', $default: 'Entry with no name' },
    },
    access: 'auth',
  }
  const data = [undefined, { id: 12345, createdAt: date, updatedAt: date }]
  const expected = [
    {
      $type: 'entry',
      id: '12345',
      title: 'Entry with no name',
      createdAt: date,
      updatedAt: date,
    },
  ]

  const mapping = schema(def).mapping
  const ret = mapTransform(mapping, { functions: builtIns })(data)

  t.deepEqual(ret, expected)
})

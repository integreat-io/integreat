import test from 'ava'
import { mapTransform } from 'map-transform'
import builtIns from '../transformers/builtIns'

import schema from '.'

// Tests

test('should setup schema', t => {
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    fields: {
      attributes: {
        title: 'string',
        text: { $cast: 'string' },
        age: 'integer'
      },
      relationships: {
        author: 'user',
        comments: { $cast: 'comment' }
      }
    },
    access: 'auth'
  }
  const expectedAttributes = {
    title: { $cast: 'string' },
    text: { $cast: 'string' },
    age: { $cast: 'integer' }
  }
  const expectedRelationships = {
    author: { $cast: 'user' },
    comments: { $cast: 'comment' }
  }

  const ret = schema(def)

  t.truthy(ret)
  t.is(ret.id, 'entry')
  t.is(ret.plural, 'entries')
  t.is(ret.service, 'entries')
  t.is(ret.access, 'auth')
  t.false(ret.internal)
  t.truthy(ret.fields)
  t.deepEqual(ret.fields.attributes, expectedAttributes)
  t.deepEqual(ret.fields.relationships, expectedRelationships)
})

test('should set internal prop', t => {
  const def = {
    id: 'entry',
    service: 'entries',
    internal: true
  }

  const ret = schema(def)

  t.true(ret.internal)
})

test('should infer plural when not set', t => {
  const type = {
    id: 'article',
    fields: {}
  }

  const ret = schema(type)

  t.is(ret.id, 'article')
  t.is(ret.plural, 'articles')
})

test('should include base fields', t => {
  const type = {
    id: 'entry',
    service: 'entries',
    fields: {}
  }
  const expected = {
    id: { $cast: 'string' },
    createdAt: { $cast: 'date' },
    updatedAt: { $cast: 'date' }
  }

  const ret = schema(type)

  t.deepEqual(ret.fields, expected)
})

test('should override base fields in definition', t => {
  const type = {
    id: 'entry',
    service: 'entries',
    fields: {
      id: 'date',
      createdAt: 'boolean',
      updatedAt: 'boolean'
    }
  }
  const expected = {
    id: { $cast: 'string' },
    createdAt: { $cast: 'date' },
    updatedAt: { $cast: 'date' }
  }

  const ret = schema(type)

  t.deepEqual(ret.fields, expected)
})

// Tests -- cast mapping

test('should provide cast mapping', t => {
  const date = new Date('2019-01-18T03:43:52Z')
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    fields: {
      title: { $cast: 'string', $default: 'Entry with no name' },
      text: 'string',
      age: { $cast: 'integer' },
      author: 'user',
      comments: { $cast: 'comment[]' }
    },
    access: 'auth'
  }
  const data = [
    {
      id: 12345,
      age: '244511383',
      text: 'The first entry',
      createdAt: date,
      updatedAt: date,
      author: 'maryk',
      comments: 'comment23'
    }
  ]
  const expected = [
    {
      $schema: 'entry',
      id: '12345',
      title: 'Entry with no name',
      text: 'The first entry',
      age: 244511383,
      createdAt: date,
      updatedAt: date,
      author: { id: 'maryk', $ref: 'user' },
      comments: [{ id: 'comment23', $ref: 'comment' }]
    }
  ]

  const mapping = schema(def).mapping
  const ret = mapTransform(mapping, { functions: builtIns })(data)

  t.deepEqual(ret, expected)
})

import test from 'ava'
import { mapTransform } from 'map-transform'
import builtIns from '../transformers/builtIns'

import schema from '.'

// Tests

test('should setup schema', t => {
  const type = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    attributes: {
      title: { type: 'string' },
      text: { type: 'string' },
      age: { type: 'integer' }
    },
    relationships: {
      author: { type: 'user' },
      comments: { type: 'comment' }
    },
    access: 'auth'
  }

  const ret = schema(type)

  t.truthy(ret)
  t.is(ret.id, 'entry')
  t.is(ret.plural, 'entries')
  t.is(ret.service, 'entries')
  t.is(ret.access, 'auth')
  t.false(ret.internal)
  t.deepEqual(ret.attributes.title, { type: 'string' })
  t.deepEqual(ret.attributes.text, { type: 'string' })
  t.deepEqual(ret.attributes.age, { type: 'integer' })
  t.deepEqual(ret.relationships.author, { type: 'user' })
})

test('should infer plural when not set', t => {
  const type = {
    id: 'article',
    attributes: {}
  }

  const ret = schema(type)

  t.is(ret.id, 'article')
  t.is(ret.plural, 'articles')
})

test('should include base attributes', t => {
  const type = {
    id: 'entry',
    service: 'entries',
    attributes: {}
  }
  const expected = {
    id: { type: 'string' },
    type: { type: 'string' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
  }

  const ret = schema(type)

  t.deepEqual(ret.attributes, expected)
})

test('should override base attributes in definition', t => {
  const type = {
    id: 'entry',
    service: 'entries',
    attributes: {
      id: { type: 'date' },
      createdAt: { type: 'boolean' },
      updatedAt: { type: 'boolean' }
    }
  }
  const expected = {
    id: { type: 'string' },
    type: { type: 'string' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
  }

  const ret = schema(type)

  t.deepEqual(ret.attributes, expected)
})

test('should always set relationships object', t => {
  const type = {
    id: 'entry',
    service: 'entries',
    attributes: {}
  }

  const ret = schema(type)

  t.deepEqual(ret.relationships, {})
})

test('should expand short value form', t => {
  const type = {
    id: 'entry',
    service: 'entries',
    attributes: {
      title: 'string',
      age: 'integer'
    },
    relationships: {
      author: 'user'
    }
  }

  const ret = schema(type)

  t.deepEqual(ret.attributes.title, { type: 'string' })
  t.deepEqual(ret.attributes.age, { type: 'integer' })
  t.deepEqual(ret.relationships.author, { type: 'user' })
})

test('should set internal prop', t => {
  const type = {
    id: 'entry',
    service: 'entries',
    internal: true
  }

  const ret = schema(type)

  t.true(ret.internal)
})

// Tests -- cast mapping

test('should provide cast mapping', t => {
  const date = new Date('2019-01-18T03:43:52Z')
  const def = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    attributes: {
      title: { $cast: 'string', $default: 'Entry with no name' },
      text: 'string',
      age: { $cast: 'integer' }
    },
    relationships: {
      author: 'user',
      comments: { $cast: 'comment[]' }
    },
    access: 'auth'
  }
  const data = [
    {
      id: 12345,
      attributes: {
        age: '244511383',
        text: 'The first entry',
        createdAt: date,
        updatedAt: date
      },
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
      attributes: {
        title: 'Entry with no name',
        text: 'The first entry',
        age: 244511383,
        createdAt: date,
        updatedAt: date
      },
      relationships: {
        author: { id: 'maryk', $ref: 'user' },
        comments: [{ id: 'comment23', $ref: 'comment' }]
      }
    }
  ]

  const mapping = schema(def).mapping
  const ret = mapTransform(mapping, { functions: builtIns })(data)

  t.deepEqual(ret, expected)
})

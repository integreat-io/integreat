import test from 'ava'
import schema from '../schema'
import jsonTransform from '../../tests/helpers/resources/transformers/jsonTransform'

import setupMapping from '.'

// Helpers

const schemas = {
  entry: schema({
    id: 'entry',
    attributes: {
      title: { type: 'string' },
      one: 'integer',
      two: 'integer',
    },
    relationships: {
      comments: { type: 'comment' },
      author: 'user',
    },
  }),
  customer: schema({
    id: 'customer',
    service: 'vendorApi',
    attributes: {
      customerType: 'string',
      name: 'string',
      description: 'string',
      address: 'string',
      externalKey: 'string',
      paID: 'string',
      paGUID: 'string',
    },
    relationships: {
      identities: 'identity[]',
      accessPoints: 'accessPoint[]',
    },
  }),
  user: schema({
    id: 'user',
    attributes: {
      name: 'string',
      role: 'string',
    },
    relationships: {},
  }),
  comment: schema({
    id: 'comment',
    attributes: {
      text: 'string',
    },
    relationships: {},
  }),
}

const revFn = (fn) => Object.assign((x) => x, { rev: fn })

const wrapData = (data, params) => ({ data, params })

const createdAt = new Date('2016-11-01')
const updatedAt = new Date('2016-11-13')

// Tests

test('should set id, type, and service', (t) => {
  const mapping = setupMapping({ schemas })({
    id: 'entriesMapping',
    type: 'entry',
    service: 'entries',
  })

  t.truthy(mapping)
  t.is(mapping.id, 'entriesMapping')
  t.is(mapping.type, 'entry')
  t.is(mapping.schema, schemas.entry)
})

test('should set default values', (t) => {
  const mapping = setupMapping({ schemas })({ type: 'entry' })

  t.is(mapping.id, null)
})

test('should throw when no type', (t) => {
  t.throws(() => {
    setupMapping({ schemas })({})
  })
})

test('should throw when when type not found', (t) => {
  t.throws(() => {
    setupMapping()({ type: 'unknown' })
  })
})

// Tests -- fromService

test('fromService should return empty array when no data', (t) => {
  const def = {
    type: 'entry',
    attributes: { title: 'title' },
  }
  const mapping = setupMapping({ schemas })(def)

  const ret = mapping.fromService()

  t.deepEqual(ret, [])
})

test('fromService should return empty array when data does not match the path', (t) => {
  const def = {
    type: 'entry',
    path: 'unknown',
    attributes: { title: 'title' },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData({ item: {} })

  const ret = mapping.fromService(data)

  t.deepEqual(ret, [])
})

test('fromService should return mapped data', (t) => {
  const def = {
    type: 'entry',
    path: 'item',
    attributes: {
      id: 'key',
      title: { path: 'title' },
      one: 'values.first',
      two: 'values.second.value',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    relationships: {
      comments: { path: 'refs[].note' },
      author: 'userId',
    },
  }
  const data = wrapData({
    item: {
      key: 'ent1',
      title: 'Entry 1',
      values: { first: 1, second: { value: 2 } },
      createdAt,
      updatedAt,
      refs: [{ note: 'no1' }, { note: 'no2' }],
      userId: 'johnf',
    },
  })
  const expected = [
    {
      id: 'ent1',
      type: 'entry',
      attributes: {
        title: 'Entry 1',
        one: 1,
        two: 2,
        createdAt,
        updatedAt,
      },
      relationships: {
        comments: [
          { id: 'no1', type: 'comment' },
          { id: 'no2', type: 'comment' },
        ],
        author: { id: 'johnf', type: 'user' },
      },
    },
  ]
  const mapping = setupMapping({ schemas })(def)

  const ret = mapping.fromService(data)

  t.deepEqual(ret, expected)
})

test('fromService should map field with value null', (t) => {
  const def = {
    type: 'entry',
    attributes: {
      id: 'key',
      title: 'title',
    },
    relationships: {},
  }
  const data = wrapData({
    key: 'ent1',
    title: null,
  })
  const mapping = setupMapping({ schemas })(def)

  const ret = mapping.fromService(data)

  t.is(ret[0].id, 'ent1')
  t.is(ret[0].attributes.title, null)
})

test('fromService should map with default', (t) => {
  const def = {
    type: 'entry',
    attributes: {
      id: 'key',
      title: { path: 'title', default: 'Untitled' },
    },
    relationships: {},
  }
  const data = wrapData({
    key: 'ent1',
  })
  const mapping = setupMapping({ schemas })(def)

  const ret = mapping.fromService(data, { onlyMappedValues: false })

  t.is(ret[0].id, 'ent1')
  t.is(ret[0].attributes.title, 'Untitled')
})

test('fromService should return several items', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: {
      one: { path: 'values.first' },
    },
  }
  const item = setupMapping({ schemas })(def)
  const data = wrapData({
    items: [{ values: { first: 1 } }, { values: { first: 2 } }],
  })

  const ret = item.fromService(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].attributes.one, 1)
  t.is(ret[1].attributes.one, 2)
})

test('fromService should transform attributes', (t) => {
  const addTwo = (value) => value + 2
  const def = {
    type: 'entry',
    attributes: {
      one: {
        path: 'values.first',
        transform: [addTwo],
      },
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData({ values: { first: 1 } })

  const [ret] = mapping.fromService(data)

  t.is(ret.attributes.one, 3)
})

test('fromService should transform attributes with named transformers', (t) => {
  const def = {
    type: 'entry',
    attributes: {
      one: {
        path: 'values.first',
        transform: ['addTwo', 'square'],
      },
    },
  }
  const transformers = {
    addTwo: (value) => value + 2,
    square: (value) => value * value,
  }
  const mapping = setupMapping({ schemas, transformers })(def)
  const data = wrapData({ values: { first: 1 } })

  const [ret] = mapping.fromService(data)

  t.is(ret.attributes.one, 9)
})

test('fromService should map id with transform', (t) => {
  const upperCase = (id) => (typeof id === 'string' ? id.toUpperCase() : id)
  const def = {
    type: 'entry',
    path: 'item',
    attributes: {
      id: { path: 'key', transform: [upperCase] },
    },
    relationships: {},
  }
  const data = wrapData({ item: { key: 'ent1' } })
  const mapping = setupMapping({ schemas })(def)

  const ret = mapping.fromService(data)

  t.is(ret[0].id, 'ENT1')
})

test('fromService should use sub path', (t) => {
  const def = {
    type: 'entry',
    attributes: {
      one: {
        path: 'values',
        transform: 'jsonTransform',
        sub: 'first',
      },
    },
  }
  const transformers = { jsonTransform }
  const mapping = setupMapping({ schemas, transformers })(def)
  const data = wrapData({ values: JSON.stringify({ first: 1 }) })

  const [ret] = mapping.fromService(data)

  t.is(ret.attributes.one, 1)
})

test('fromService should use sub mapping', (t) => {
  const def = {
    type: 'entry',
    attributes: {
      one: {
        path: 'values',
        sub: { path: 'first' },
      },
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData({ values: { first: 1 } })

  const [ret] = mapping.fromService(data)

  t.is(ret.attributes.one, 1)
})

test('fromService should use array of paths as alternative paths', (t) => {
  const def = {
    type: 'entry',
    attributes: {
      title: 'heading',
      one: ['values.first', 'values.second'],
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData([
    { values: { first: 1 }, heading: 'First' },
    { values: { second: 2 }, heading: 'Second' },
  ])

  const ret = mapping.fromService(data)

  t.is(ret[0].attributes.one, 1)
  t.is(ret[1].attributes.one, 2)
})

test('fromService should use param instead of attribute path', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: { title: 'headline', one: '$params.first' },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData({ items: [{ headline: 'First' }] }, { first: 1 })

  const [ret] = mapping.fromService(data)

  t.is(ret.attributes.title, 'First')
  t.is(ret.attributes.one, 1)
})

test('fromService should set relationship with array', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      comments: { path: 'item.notes' },
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData({ item: { notes: ['no1', 'no3'] } })
  const expected = [
    { id: 'no1', type: 'comment' },
    { id: 'no3', type: 'comment' },
  ]

  const [ret] = mapping.fromService(data)

  t.deepEqual(ret.relationships.comments, expected)
})

test('fromService should map full relationship item', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      author: { mapping: 'entries-user' },
    },
  }
  const mappings = [
    {
      id: 'entries-user',
      path: 'item.writer',
      type: 'user',
      attributes: {
        id: 'username',
        name: 'fullname',
      },
      relationships: {},
    },
  ]
  const mapping = setupMapping({ schemas, mappings })(def)
  const data = wrapData({
    item: { writer: { username: 'johnf', fullname: 'John F.' } },
  })
  const expected = {
    id: 'johnf',
    type: 'user',
    attributes: { name: 'John F.' },
    relationships: {},
  }

  const [ret] = mapping.fromService(data)

  t.deepEqual(ret.relationships.author, expected)
})

test('fromService should map full relationship item on a path', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      author: { path: 'item.writer', mapping: 'entries-user' },
    },
  }
  const mappings = [
    {
      id: 'entries-user',
      type: 'user',
      attributes: { id: 'username' },
      relationships: {},
    },
  ]
  const mapping = setupMapping({ schemas, mappings })(def)
  const data = wrapData({ item: { writer: { username: 'johnf' } } })

  const [ret] = mapping.fromService(data)

  t.is(ret.relationships.author.id, 'johnf')
})

test('fromService should map relationship with optional path and specified mapping', (t) => {
  const def = {
    type: 'entry',
    attributes: {
      id: 'id',
    },
    relationships: {
      author: {
        path: ['unknown.user', 'item.writer'],
        mapping: 'entries-user',
      },
    },
  }
  const mappings = [
    {
      id: 'entries-user',
      type: 'user',
      attributes: { id: 'username' },
      relationships: {},
    },
  ]
  const mapping = setupMapping({ schemas, mappings })(def)
  const data = wrapData({ id: '1', item: { writer: { username: 'johnf' } } })

  const [ret] = mapping.fromService(data)

  t.is(ret.relationships.author.id, 'johnf')
})

test('fromService should map full relationship that returns array', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      author: { path: 'parts[]', mapping: 'entries-user' },
    },
  }
  const mappings = [
    {
      id: 'entries-user',
      type: 'user',
      attributes: { id: '[0]', name: '[1]', role: '[2].role' },
      relationships: {},
    },
  ]
  const mapping = setupMapping({ schemas, mappings })(def)
  const data = wrapData({
    it: 'ent1',
    type: 'entry',
    attributes: {},
    relationships: {
      author: {
        id: 'johnf',
        type: 'user',
        attributes: { name: 'John F.', role: 'admin' },
        relationships: {},
      },
    },
  })
  const expected = { parts: ['johnf', 'John F.', { role: 'admin' }] }

  const ret = mapping.toService(data)

  t.deepEqual(ret, expected)
})

test('fromService should map full relationship item on path from relationship and type mapping', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      author: { path: 'item', mapping: 'entries-user' },
    },
  }
  const mappings = [
    {
      id: 'entries-user',
      type: 'user',
      path: 'writer',
      attributes: { id: 'username' },
      relationships: {},
    },
  ]
  const mapping = setupMapping({ schemas, mappings })(def)
  const data = wrapData({ item: { writer: { username: 'johnf' } } })

  const [ret] = mapping.fromService(data)

  t.is(ret.relationships.author.id, 'johnf')
})

test('fromService should map array of full relationship items', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      comments: { mapping: 'entries-comment' },
    },
  }
  const mappings = [
    {
      id: 'entries-comment',
      path: 'item.notes',
      type: 'comment',
      attributes: {
        id: 'id',
        text: 'note',
      },
      relationships: {},
    },
  ]
  const mapping = setupMapping({ schemas, mappings })(def)
  const data = wrapData({
    item: {
      notes: [
        { id: 'note1', note: 'Note 1.' },
        { id: 'note2', note: 'Note 2.' },
      ],
    },
  })
  const expected = [
    {
      id: 'note1',
      type: 'comment',
      attributes: { text: 'Note 1.' },
      relationships: {},
    },
    {
      id: 'note2',
      type: 'comment',
      attributes: { text: 'Note 2.' },
      relationships: {},
    },
  ]

  const [ret] = mapping.fromService(data)

  t.deepEqual(ret.relationships.comments, expected)
})

test('fromService should use param instead of relationship path', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      comments: { type: 'comment', path: '$params.comment' },
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData({ item: { notes: 'no1' } }, { comment: 'no3' })
  const expected = { id: 'no3', type: 'comment' }

  const [ret] = mapping.fromService(data)

  t.deepEqual(ret.relationships.comments, expected)
})

test('fromService should use transformers with relationship', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      author: { path: 'user', transform: 'removeDomain' },
    },
  }
  const transformers = {
    removeDomain: (value) => value.split('/')[1] || value,
  }
  const mapping = setupMapping({ schemas, transformers })(def)
  const data = wrapData({ user: 'desk/johnf' })
  const expected = { id: 'johnf', type: 'user' }

  const [ret] = mapping.fromService(data)

  t.deepEqual(ret.relationships.author, expected)
})

test('fromService should use transform pipeline', (t) => {
  const data = wrapData({ id: 'item1', title: 'First item' })
  const def = {
    type: 'entry',
    attributes: {
      title: { path: 'title' },
    },
    transform: [
      (item) => ({ ...item, attributes: { ...item.attributes, one: 1 } }),
      'second',
    ],
  }
  const transformers = {
    second: (item) => ({
      ...item,
      attributes: {
        ...item.attributes,
        two: 2,
      },
    }),
  }
  const mapping = setupMapping({ schemas, transformers })(def)

  const [ret] = mapping.fromService(data)

  t.is(ret.attributes.one, 1)
  t.is(ret.attributes.two, 2)
})

test('fromService should filter away items in array', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: { id: 'id' },
    filterFrom: [(obj) => obj.id === 'ent2'],
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData({ items: [{ id: 'ent1' }, { id: 'ent2' }] })

  const ret = mapping.fromService(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent2')
})

test('fromService should not filter with filterTo', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: { id: 'id' },
    filterTo: [(obj) => obj.id === 'ent2'],
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData({ items: [{ id: 'ent1' }, { id: 'ent2' }] })

  const ret = mapping.fromService(data)

  t.is(ret.length, 2)
})

test('fromService should qualify array of data', (t) => {
  const def = {
    type: 'entry',
    qualifier: 'type="entry"',
    attributes: { id: 'id', title: 'title' },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData([
    { id: 'ent1', type: 'other', title: 'Entry 1' },
    { id: 'ent2', type: 'entry', title: 'Entry 2' },
  ])

  const ret = mapping.fromService(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent2')
})

test('fromService should skip invalid qualifier', (t) => {
  const def = {
    type: 'entry',
    qualifier: 'type=entry',
    attributes: { id: 'id', title: 'title' },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData([
    { id: 'ent1', type: 'other', title: 'Entry 1' },
    { id: 'ent2', type: 'entry', title: 'Entry 2' },
  ])

  const ret = mapping.fromService(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
})

test('fromService should qualify data object', (t) => {
  const def = {
    type: 'entry',
    qualifier: 'type="entry"',
    attributes: { id: 'id', title: 'title' },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData({ id: 'ent1', type: 'other', title: 'Entry 1' })

  const ret = mapping.fromService(data)

  t.deepEqual(ret, [])
})

test('fromService should use data as item when no attr/rel mappers', (t) => {
  const schemas = {
    other: schema({
      id: 'other',
      attributes: { title: 'string' },
      relationships: { author: 'user' },
    }),
  }
  const def = { type: 'other' }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData({
    id: 'item',
    type: 'other',
    attributes: {
      createdAt,
      updatedAt,
      title: 'Other entry',
    },
    relationships: {
      author: { id: 'theman', type: 'user' },
    },
  })
  const expected = {
    id: 'item',
    type: 'other',
    attributes: {
      createdAt,
      updatedAt,
      title: 'Other entry',
    },
    relationships: {
      author: { id: 'theman', type: 'user' },
    },
  }

  const [ret] = mapping.fromService(data)

  t.deepEqual(ret, expected)
})

test('fromService should still transform when no attr/rel mappers', (t) => {
  const schemas = {
    other: schema({ id: 'other', attributes: { title: 'string' } }),
  }
  const def = {
    type: 'other',
    transform: [(item) => ({ ...item, attributes: { title: 'Transformed!' } })],
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData({ id: 'item', type: 'other' })

  const [ret] = mapping.fromService(data)

  t.is(ret.id, 'item')
  t.is(ret.attributes.title, 'Transformed!')
})

test('fromService should not use data with wrong type when no attr/rel mappers', (t) => {
  const def = { type: 'entry' }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapData({
    id: 'item',
    type: 'wrong',
    attributes: { title: 'Other entry' },
  })

  const ret = mapping.fromService(data)

  t.deepEqual(ret, [])
})

test('fromService should not map with toService mappings', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: {
      id: 'key',
      one: 'values.first',
    },
    relationships: {
      comments: { path: 'refs.notes[]' },
    },
    toService: {
      '$params.section': 'values.section',
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = {
    items: [
      {
        key: 'ent1',
        values: { first: 1, section: 'news' },
        refs: { notes: ['comment1'] },
      },
      {
        key: 'ent2',
        values: { first: 2, section: 'news' },
        refs: { notes: ['comment2'] },
      },
    ],
  }
  const params = { section: 'news' }
  const expected = [
    {
      id: 'ent1',
      type: 'entry',
      attributes: { one: 1 },
      relationships: { comments: [{ id: 'comment1', type: 'comment' }] },
    },
    {
      id: 'ent2',
      type: 'entry',
      attributes: { one: 2 },
      relationships: { comments: [{ id: 'comment2', type: 'comment' }] },
    },
  ]

  const ret = mapping.fromService(wrapData(data, params))

  t.deepEqual(ret, expected)
})

// Tests -- toService

test('toService should return null when no data', (t) => {
  const mapping = setupMapping({ schemas })({ type: 'entry' })

  const ret = mapping.toService()

  t.is(ret, null)
})

test('toService should return mapped data', (t) => {
  const def = {
    type: 'entry',
    path: 'item',
    attributes: {
      id: 'key',
      title: 'type',
      one: { path: 'values.first' },
      two: 'values.second.value',
      createdAt: { path: 'created' },
      updatedAt: 'updated',
    },
    relationships: {
      'comments.id': { path: 'refs.note' },
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = {
    id: 'ent1',
    type: 'entry',
    attributes: {
      one: 1,
      two: 2,
      title: 'typish',
      createdAt: new Date('2016-11-01'),
      updatedAt: new Date('2016-11-13'),
    },
    relationships: {
      comments: { id: 'no1', type: 'comment' },
    },
  }
  const expected = {
    item: {
      key: 'ent1',
      type: 'typish',
      values: {
        first: 1,
        second: { value: 2 },
      },
      created: data.attributes.createdAt,
      updated: data.attributes.updatedAt,
      refs: { note: 'no1' },
    },
  }

  const ret = mapping.toService(wrapData(data))

  t.deepEqual(ret, expected)
})

test('toService should map to array', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: { one: { path: 'values.first' } },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }
  const expected = {
    items: [{ values: { first: 1 } }],
  }

  const ret = mapping.toService(wrapData(data))

  t.deepEqual(ret, expected)
})

test('toService should skip array of alternative paths and use first one', (t) => {
  const def = {
    type: 'entry',
    attributes: {
      title: 'heading',
      one: ['values.first', 'values.second'],
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = [
    { id: 'ent1', type: 'entry', attributes: { title: 'First', one: 1 } },
    { id: 'ent2', type: 'entry', attributes: { title: 'Second', one: 2 } },
  ]
  const expected = [
    { values: { first: 1 }, heading: 'First' },
    { values: { first: 2 }, heading: 'Second' },
  ]

  const ret = mapping.toService(wrapData(data))

  t.deepEqual(ret, expected)
})

test('toService should map to top level array', (t) => {
  const def = {
    type: 'entry',
    attributes: { one: { path: 'values.first' } },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = [
    { id: 'ent1', type: 'entry', attributes: { one: 1 } },
    { id: 'ent2', type: 'entry', attributes: { one: 2 } },
  ]
  const expected = [{ values: { first: 1 } }, { values: { first: 2 } }]

  const ret = mapping.toService(wrapData(data))

  t.deepEqual(ret, expected)
})

test('toService should map to target item', (t) => {
  const def = {
    type: 'entry',
    path: 'item',
    attributes: { one: { path: 'values.first' } },
  }
  const mapping = setupMapping({ schemas })(def)
  const target = { existing: true }
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }
  const expected = {
    item: { values: { first: 1 } },
    existing: true,
  }

  const ret = mapping.toService(wrapData(data), target)

  t.deepEqual(ret, expected)
})

test('toService should map to target item with conflict', (t) => {
  const def = {
    type: 'entry',
    path: 'item',
    attributes: { one: { path: 'values.first' } },
  }
  const mapping = setupMapping({ schemas })(def)
  const target = { item: { values: { first: 0 } } }
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }
  const expected = { item: { values: { first: 1 } } }

  const ret = mapping.toService(wrapData(data), target)

  t.deepEqual(ret, expected)
})

test('toService should map array of items', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: { one: { path: 'values.first' } },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = [
    { id: 'ent1', type: 'entry', attributes: { one: 1 } },
    { id: 'ent1', type: 'entry', attributes: { one: 2 } },
  ]
  const expected = {
    items: [{ values: { first: 1 } }, { values: { first: 2 } }],
  }

  const ret = mapping.toService(wrapData(data))

  t.deepEqual(ret, expected)
})

test('toService should append object to target array', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: { one: { path: 'values.first' } },
  }
  const mapping = setupMapping({ schemas })(def)
  const target = { items: [{ values: { first: 1 } }] }
  const data = { id: 'ent1', type: 'entry', attributes: { one: 2 } }
  const expected = {
    items: [{ values: { first: 1 } }, { values: { first: 2 } }],
  }

  const ret = mapping.toService(wrapData(data), target)

  t.deepEqual(ret, expected)
})

test('toService should append object to target top array', (t) => {
  const def = {
    type: 'entry',
    path: '[]',
    attributes: { one: { path: 'values.first' } },
  }
  const mapping = setupMapping({ schemas })(def)
  const target = [{ existing: true }]
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }
  const expected = [{ existing: true }, { values: { first: 1 } }]

  const ret = mapping.toService(wrapData(data), target)

  t.deepEqual(ret, expected)
})

test('toService should transform attributes', (t) => {
  const addTwo = revFn((value) => value + 2)
  const def = {
    type: 'entry',
    attributes: {
      one: {
        path: 'values.first',
        transform: [addTwo],
      },
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }

  const ret = mapping.toService(wrapData(data))

  t.is(ret.values.first, 3)
})

test('toService should transform attributes with transformTo', (t) => {
  const addTwo = (value) => value + 2
  const def = {
    type: 'entry',
    attributes: {
      one: {
        path: 'values.first',
        transformTo: [addTwo],
      },
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }

  const ret = mapping.toService(wrapData(data))

  t.is(ret.values.first, 3)
})

test('toService should map array of relationships', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      'comments.id': { path: 'item.notes[]' },
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = {
    id: 'ent1',
    type: 'entry',
    attributes: {},
    relationships: {
      comments: [
        { id: 'no1', type: 'comment' },
        { id: 'no3', type: 'comment' },
      ],
    },
  }
  const expectedItem = { notes: ['no1', 'no3'] }

  const ret = mapping.toService(wrapData(data))

  t.truthy(ret)
  t.deepEqual(ret.item, expectedItem)
})

test('toService should transform relationships as array of ids', (t) => {
  const prependWithCom = revFn((value) => 'com_' + value)
  const def = {
    type: 'entry',
    relationships: {
      'comments.id': {
        path: 'item.note',
        transform: [prependWithCom],
      },
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = {
    id: 'ent1',
    type: 'entry',
    attributes: {},
    relationships: { comments: { id: 'no1', type: 'comment' } },
  }

  const ret = mapping.toService(wrapData(data))

  t.truthy(ret)
  t.deepEqual(ret.item, { note: 'com_no1' })
})

test('toService should transform relationships as array of objects', (t) => {
  const prependWithCom = revFn((value) => 'com_' + value.id)
  const def = {
    type: 'entry',
    relationships: {
      comments: {
        path: 'item.note',
        transform: [prependWithCom],
      },
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = {
    id: 'ent1',
    type: 'entry',
    attributes: {},
    relationships: { comments: { id: 'no1', type: 'comment' } },
  }

  const ret = mapping.toService(wrapData(data))

  t.truthy(ret)
  t.deepEqual(ret.item, { note: 'com_no1' })
})

test('toService should transform item', (t) => {
  const def = {
    type: 'entry',
    attributes: { id: 'key' },
    transform: ['first'],
  }
  const transformers = {
    first: revFn((item) => ({ ...item, id: 'ent1000' })),
  }
  const mapping = setupMapping({ schemas, transformers })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }

  const ret = mapping.toService(wrapData(data))

  t.is(ret.key, 'ent1000')
})

test('toService should transform item with transformTo', (t) => {
  const def = {
    type: 'entry',
    attributes: { id: 'key' },
    transformTo: ['first'],
  }
  const transformers = {
    first: (item) => ({ ...item, id: 'ent1000' }),
  }
  const mapping = setupMapping({ schemas, transformers })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }

  const ret = mapping.toService(wrapData(data))

  t.is(ret.key, 'ent1000')
})

test('toService should return null when filter returns false', (t) => {
  const def = {
    type: 'entry',
    attributes: { one: { path: 'values.first' } },
    filterTo: [() => true, () => false],
  }
  const mapping = setupMapping({ schemas })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }

  const ret = mapping.toService(wrapData(data))

  t.is(ret, null)
})

test('toService should not filter with filterFrom', (t) => {
  const def = {
    type: 'entry',
    attributes: { one: { path: 'values.first' } },
    filterFrom: [() => true, () => false],
  }
  const mapping = setupMapping({ schemas })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }

  const ret = mapping.toService(wrapData(data))

  t.truthy(ret)
})

test('toService should use data as item when no attr/rel mappers', (t) => {
  const def = { type: 'entry' }
  const mapping = setupMapping({ schemas })(def)
  const data = {
    id: 'item',
    type: 'entry',
    attributes: {
      createdAt,
      updatedAt,
      title: 'Other entry',
    },
    relationships: {
      author: { id: 'theman', type: 'user' },
    },
  }

  const ret = mapping.toService(wrapData(data))

  t.deepEqual(ret, data)
})

test('toService should use transform when no attr/rel mappers', (t) => {
  const def = {
    type: 'entry',
    transform: [
      revFn((item) => ({ ...item, attributes: { title: 'From transform' } })),
    ],
  }
  const mapping = setupMapping({ schemas })(def)
  const data = { id: 'item', type: 'entry' }

  const ret = mapping.toService(wrapData(data))

  t.is(ret.id, 'item')
  t.is(ret.attributes.title, 'From transform')
})

test('toService should map with toService mappings', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: {
      id: 'key',
      one: 'values.first',
    },
    relationships: {
      'comments.id': { path: 'refs.notes[]' },
    },
    toService: {
      '$params.section': 'values.section',
    },
  }
  const mapping = setupMapping({ schemas })(def)
  const data = [
    {
      id: 'ent1',
      type: 'entry',
      attributes: { one: 1 },
      relationships: { comments: [{ id: 'comment1', type: 'comment' }] },
    },
    {
      id: 'ent2',
      type: 'entry',
      attributes: { one: 2 },
      relationships: { comments: [{ id: 'comment2', type: 'comment' }] },
    },
  ]
  const params = { section: 'news' }
  const expected = {
    items: [
      {
        key: 'ent1',
        values: { first: 1, section: 'news' },
        refs: { notes: ['comment1'] },
      },
      {
        key: 'ent2',
        values: { first: 2, section: 'news' },
        refs: { notes: ['comment2'] },
      },
    ],
  }

  const ret = mapping.toService(wrapData(data, params))

  t.deepEqual(ret, expected)
})

// Tests -- mappings array

test('should select mapping from id', (t) => {
  const mappings = [
    {
      id: 'entries-entry',
      type: 'entry',
      path: 'item',
      attributes: {
        id: 'key',
        title: { path: 'title' },
        one: 'values.first',
        two: 'values.second.value',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      relationships: {
        comments: { path: 'refs[].note' },
        author: 'userId',
      },
    },
  ]
  const def = 'entries-entry'
  const data = wrapData({
    item: {
      key: 'ent1',
      title: 'Entry 1',
      values: { first: 1, second: { value: 2 } },
      createdAt,
      updatedAt,
      refs: [{ note: 'no1' }, { note: 'no2' }],
      userId: 'johnf',
    },
  })

  const mapping = setupMapping({ schemas, mappings })(def)
  const ret = mapping.fromService(data)

  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
  t.is(ret[0].type, 'entry')
  t.is(ret[0].attributes.title, 'Entry 1')
})

test('should use given type', (t) => {
  const mappings = [
    {
      id: 'entries-entry',
      type: 'entry',
      path: 'item',
      attributes: {
        id: 'key',
        title: { path: 'title' },
        one: 'values.first',
        two: 'values.second.value',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      relationships: {
        comments: { path: 'refs[].note' },
        author: 'userId',
      },
    },
  ]
  const def = 'entries-entry'
  const type = 'customer'
  const data = wrapData({
    item: {
      key: 'ent1',
      title: 'Entry 1',
      values: { first: 1, second: { value: 2 } },
      createdAt,
      updatedAt,
      refs: [{ note: 'no1' }, { note: 'no2' }],
      userId: 'johnf',
    },
  })

  const mapping = setupMapping({ schemas, mappings })(def, type)
  const ret = mapping.fromService(data)

  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
  t.is(ret[0].type, 'customer')
})

test('should return null if mapping id is unknown', (t) => {
  const mappings = []
  const def = 'unknown'
  const type = 'customer'

  const mapping = setupMapping({ schemas, mappings })(def, type)

  t.is(mapping, null)
})

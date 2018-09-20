import test from 'ava'
import schema from '../schema'

import setupMapping from '.'

// Helpers

const schemas = {
  entry: schema({
    id: 'entry',
    attributes: {
      title: { type: 'string' },
      one: 'integer',
      two: 'integer'
    },
    relationships: {
      comments: { type: 'comment' },
      author: 'user'
    }
  })
}

const revFn = (fn) => Object.assign((x) => x, { rev: fn })

const wrapResponse = (data, params) => ({ data, params })

// Tests

test('should exist', (t) => {
  t.is(typeof setupMapping, 'function')
})

test('should set id, type, and service', (t) => {
  const mapping = setupMapping({ schemas })({ id: 'entriesMapping', type: 'entry', service: 'entries' })

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
    attributes: { title: 'title' }
  }
  const mapping = setupMapping({ schemas })(def)

  const ret = mapping.fromService()

  t.deepEqual(ret, [])
})

test('fromService should return empty array when data does not match the path', (t) => {
  const def = {
    type: 'entry',
    path: 'unknown',
    attributes: { title: 'title' }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse({ item: {} })

  const ret = mapping.fromService(data)

  t.deepEqual(ret, [])
})

test('fromService should return mapped data', (t) => {
  const createdAt = new Date('2016-11-01')
  const updatedAt = new Date('2016-11-13')
  const def = {
    type: 'entry',
    path: 'item',
    attributes: {
      id: 'key',
      title: { path: 'title' },
      one: 'values.first',
      two: 'values.second.value',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    relationships: {
      comments: { path: 'refs[].note' },
      author: 'userId'
    }
  }
  const data = wrapResponse({
    item: {
      key: 'ent1',
      title: 'Entry 1',
      values: { first: 1, second: { value: 2 } },
      createdAt,
      updatedAt,
      refs: [{ note: 'no1' }, { note: 'no2' }],
      userId: 'johnf'
    }
  })
  const expected = [{
    id: 'ent1',
    type: 'entry',
    attributes: {
      title: 'Entry 1',
      one: 1,
      two: 2,
      createdAt,
      updatedAt
    },
    relationships: {
      comments: [
        { id: 'no1', type: 'comment' },
        { id: 'no2', type: 'comment' }
      ],
      author: { id: 'johnf', type: 'user' }
    }
  }]
  const mapping = setupMapping({ schemas })(def)

  const ret = mapping.fromService(data)

  t.deepEqual(ret, expected)
})

test('fromService should return several items', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: {
      one: { path: 'values.first' }
    }
  }
  const item = setupMapping({ schemas })(def)
  const data = wrapResponse({ items: [{ values: { first: 1 } }, { values: { first: 2 } }] })

  const ret = item.fromService(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].attributes.one, 1)
  t.is(ret[1].attributes.one, 2)
})

test('fromService should format attributes', (t) => {
  const addTwo = (value) => value + 2
  const def = {
    type: 'entry',
    attributes: {
      one: {
        path: 'values.first',
        format: [addTwo]
      }
    }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse({ values: { first: 1 } })

  const [ret] = mapping.fromService(data)

  t.is(ret.attributes.one, 3)
})

test.todo('fromservice should use named formatters for attributes')

test('fromService should use array of paths as alternative paths', (t) => {
  const def = {
    type: 'entry',
    attributes: {
      title: 'heading',
      one: ['values.first', 'values.second']
    }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse([
    { values: { first: 1 }, heading: 'First' },
    { values: { second: 2 }, heading: 'Second' }
  ])

  const ret = mapping.fromService(data)

  t.is(ret[0].attributes.one, 1)
  t.is(ret[1].attributes.one, 2)
})

test('fromService should use param instead of attribute path', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: { title: 'headline', one: '$params.first' }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse({ items: [{ headline: 'First' }] }, { first: 1 })

  const [ret] = mapping.fromService(data)

  t.is(ret.attributes.title, 'First')
  t.is(ret.attributes.one, 1)
})

test('fromService should set relationship with array', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      comments: { path: 'item.notes' }
    }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse({ item: { notes: ['no1', 'no3'] } })
  const expected = [{ id: 'no1', type: 'comment' }, { id: 'no3', type: 'comment' }]

  const [ret] = mapping.fromService(data)

  t.deepEqual(ret.relationships.comments, expected)
})

test('fromService should use param instead of relationship path', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      comments: { type: 'comment', path: '$params.comment' }
    }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse({ item: { notes: 'no1' } }, { comment: 'no3' })
  const expected = { id: 'no3', type: 'comment' }

  const [ret] = mapping.fromService(data)

  t.deepEqual(ret.relationships.comments, expected)
})

test('fromService should use transform pipeline', (t) => {
  const data = wrapResponse({ id: 'item1', title: 'First item' })
  const def = {
    type: 'entry',
    attributes: {
      title: { path: 'title' }
    },
    transform: [
      (item) => ({ ...item, attributes: { ...item.attributes, one: 1 } }),
      'second'
    ]
  }
  const transformers = {
    second: (item) => ({
      ...item,
      attributes: {
        ...item.attributes,
        two: 2
      }
    })
  }
  const mapping = setupMapping({ schemas, transformers })(def)

  const [ret] = mapping.fromService(data)

  t.is(ret.attributes.one, 1)
  t.is(ret.attributes.two, 2)
})

test.skip('fromService should provide transform function with original data', (t) => {
  const def = {
    type: 'entry',
    attributes: { title: 'title' },
    transform: [
      (item, data) => ({ ...item, attributes: { title: data.notMapped } })
    ]
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse([{ id: 'item1', title: 'First item', notMapped: 'Original' }])

  const ret = mapping.fromService(data)

  t.is(ret[0].attributes.title, 'Original')
})

test('fromService should filter away items in array', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: { id: 'id' },
    filterFrom: [(obj) => obj.id === 'ent2']
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse({ items: [{ id: 'ent1' }, { id: 'ent2' }] })

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
    filterTo: [(obj) => obj.id === 'ent2']
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse({ items: [{ id: 'ent1' }, { id: 'ent2' }] })

  const ret = mapping.fromService(data)

  t.is(ret.length, 2)
})

test.skip('fromService should qualify array of data', (t) => {
  const def = {
    type: 'entry',
    qualifier: 'type="entry"',
    attributes: { id: 'id', title: 'title' }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse([
    { id: 'ent1', type: 'other', title: 'Entry 1' },
    { id: 'ent2', type: 'entry', title: 'Entry 2' }
  ])

  const ret = mapping.fromService(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent2')
})

test.skip('fromService should qualify data object', (t) => {
  const def = {
    type: 'entry',
    qualifier: 'type="entry"',
    attributes: { id: 'id', title: 'title' }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse({ id: 'ent1', type: 'other', title: 'Entry 1' })

  const ret = mapping.fromService(data)

  t.deepEqual(ret, [])
})

test('fromService should use data as item when no attr/rel mappers', (t) => {
  const createdAt = new Date()
  const updatedAt = new Date()
  const schemas = {
    other: schema({
      id: 'other',
      attributes: { title: 'string' },
      relationships: { author: 'user' }
    })
  }
  const def = { type: 'other' }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse({
    id: 'item',
    type: 'other',
    attributes: {
      createdAt,
      updatedAt,
      title: 'Other entry'
    },
    relationships: {
      author: { id: 'theman', type: 'user' }
    }
  })
  const expected = {
    id: 'item',
    type: 'other',
    attributes: {
      createdAt,
      updatedAt,
      title: 'Other entry'
    },
    relationships: {
      author: { id: 'theman', type: 'user' }
    }
  }

  const [ret] = mapping.fromService(data)

  t.deepEqual(ret, expected)
})

test('fromService should still transform when no attr/rel mappers', (t) => {
  const schemas = { other: schema({ id: 'other', attributes: { title: 'string' } }) }
  const def = {
    type: 'other',
    transform: [
      (item) => ({ ...item, attributes: { title: 'Transformed!' } })
    ]
  }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse({ id: 'item', type: 'other' })

  const [ret] = mapping.fromService(data)

  t.is(ret.id, 'item')
  t.is(ret.attributes.title, 'Transformed!')
})

test.skip('fromService should not use data with wrong type when no attr/rel mappers', (t) => {
  const def = { type: 'entry' }
  const mapping = setupMapping({ schemas })(def)
  const data = wrapResponse({
    id: 'item',
    type: 'wrong',
    attributes: { title: 'Other entry' }
  })

  const ret = mapping.fromService(data)

  t.deepEqual(ret, [])
})

// Tests -- toService

test('toService should exist', (t) => {
  const mapping = setupMapping({ schemas })({ type: 'entry' })

  t.is(typeof mapping.toService, 'function')
})

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
      updatedAt: 'updated'
    },
    relationships: {
      comments: { path: 'refs.note' }
    }
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
      updatedAt: new Date('2016-11-13')
    },
    relationships: {
      comments: { id: 'no1', type: 'comment' }
    }
  }
  const expected = {
    item: {
      key: 'ent1',
      type: 'typish',
      values: {
        first: 1,
        second: { value: 2 }
      },
      created: data.attributes.createdAt,
      updated: data.attributes.updatedAt,
      refs: { note: 'no1' }
    }
  }

  const ret = mapping.toService(data)

  t.deepEqual(ret, expected)
})

test('toService should map to given item', (t) => {
  const def = {
    type: 'entry',
    path: 'item',
    attributes: { one: { path: 'values.first' } }
  }
  const mapping = setupMapping({ schemas })(def)
  const target = { existing: true }
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }
  const expected = {
    item: { values: { first: 1 } },
    existing: true
  }

  const ret = mapping.toService(data, target)

  t.deepEqual(ret, expected)
})

test('toService should map to array', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: { one: { path: 'values.first' } }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }
  const expected = {
    items: [{ values: { first: 1 } }]
  }

  const ret = mapping.toService(data)

  t.deepEqual(ret, expected)
})

test('toService should append object to array', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: { one: { path: 'values.first' } }
  }
  const mapping = setupMapping({ schemas })(def)
  const target = { items: [{ values: { first: 1 } }] }
  const data = { id: 'ent1', type: 'entry', attributes: { one: 2 } }
  const expected = {
    items: [
      { values: { first: 1 } },
      { values: { first: 2 } }
    ]
  }

  const ret = mapping.toService(data, target)

  t.deepEqual(ret, expected)
})

test('toService should map array of items', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: { one: { path: 'values.first' } }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = [
    { id: 'ent1', type: 'entry', attributes: { one: 1 } },
    { id: 'ent1', type: 'entry', attributes: { one: 2 } }
  ]
  const expected = {
    items: [
      { values: { first: 1 } },
      { values: { first: 2 } }
    ]
  }

  const ret = mapping.toService(data)

  t.deepEqual(ret, expected)
})

test('toService should format attributes', (t) => {
  const addTwo = revFn((value) => value + 2)
  const def = {
    type: 'entry',
    attributes: {
      one: {
        path: 'values.first',
        format: [addTwo]
      }
    }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }

  const ret = mapping.toService(data)

  t.is(ret.values.first, 3)
})

test('toService should map array of relationships', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      comments: { path: 'item.notes[]' }
    }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = {
    id: 'ent1',
    type: 'entry',
    attributes: {},
    relationships: {
      comments: [
        { id: 'no1', type: 'comment' },
        { id: 'no3', type: 'comment' }
      ]
    }
  }
  const expectedItem = { notes: ['no1', 'no3'] }

  const ret = mapping.toService(data)

  t.truthy(ret)
  t.deepEqual(ret.item, expectedItem)
})

test('toService should format relationships', (t) => {
  const prependWithCom = revFn((value) => 'com_' + value)
  const def = {
    type: 'entry',
    relationships: {
      comments: {
        path: 'item.note',
        format: [prependWithCom]
      }
    }
  }
  const mapping = setupMapping({ schemas })(def)
  const data = {
    id: 'ent1',
    type: 'entry',
    attributes: {},
    relationships: { comments: { id: 'no1', type: 'comment' } }
  }

  const ret = mapping.toService(data)

  t.truthy(ret)
  t.deepEqual(ret.item, { note: 'com_no1' })
})

test('toService should transform item', (t) => {
  const def = {
    type: 'entry',
    attributes: { id: 'key' },
    transform: ['first']
  }
  const transformers = {
    first: revFn((item) => ({ ...item, id: 'ent1000' }))
  }
  const mapping = setupMapping({ schemas, transformers })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }

  const ret = mapping.toService(data)

  t.is(ret.key, 'ent1000')
})

test.skip('toService should provide transform function with original data', (t) => {
  const def = {
    type: 'entry',
    attributes: { one: { path: 'values.first' } },
    transform: [Object.assign(
      (x) => x,
      revFn((item, data) => ({ ...item, notMapped: data.attributes.notMapped }))
    )]
  }
  const mapping = setupMapping({ schemas })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1, notMapped: 'Original' } }

  const ret = mapping.toService(data)

  t.is(ret.notMapped, 'Original')
})

test('toService should return null when filter returns false', (t) => {
  const def = {
    type: 'entry',
    attributes: { one: { path: 'values.first' } },
    filterTo: [() => true, () => false]
  }
  const mapping = setupMapping({ schemas })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }

  const ret = mapping.toService(data)

  t.is(ret, null)
})

test('toService should not filter with filterFrom', (t) => {
  const def = {
    type: 'entry',
    attributes: { one: { path: 'values.first' } },
    filterFrom: [() => true, () => false]
  }
  const mapping = setupMapping({ schemas })(def)
  const data = { id: 'ent1', type: 'entry', attributes: { one: 1 } }

  const ret = mapping.toService(data)

  t.truthy(ret)
})

test('toService should use data as item when no attr/rel mappers', (t) => {
  const def = { type: 'entry' }
  const mapping = setupMapping({ schemas })(def)
  const data = {
    id: 'item',
    type: 'entry',
    attributes: {
      createdAt: new Date(),
      updatedAt: new Date(),
      title: 'Other entry'
    },
    relationships: {
      author: { id: 'theman', type: 'user' }
    }
  }

  const ret = mapping.toService(data)

  t.deepEqual(ret, data)
})

test('toService should use transform when no attr/rel mappers', (t) => {
  const def = {
    type: 'entry',
    transform: [
      revFn((item) => ({ ...item, attributes: { title: 'From transform' } }))
    ]
  }
  const mapping = setupMapping({ schemas })(def)
  const data = { id: 'item', type: 'entry' }

  const ret = mapping.toService(data)

  t.is(ret.id, 'item')
  t.is(ret.attributes.title, 'From transform')
})

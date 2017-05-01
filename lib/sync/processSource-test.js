import test from 'ava'
import sinon from 'sinon'
import Source from '../source'
import ItemMapper from '../itemMapper'
import ValueMapper from '../valueMapper'

import processSource from './processSource'

// Helpers

const createSource = (adapter = null) => {
  const source = new Source('entry1', adapter)
  source.fetch = {endpoint: 'http://some.api/entries/', auth: {}}
  const item = new ItemMapper('entry')
  item.attrMappers.push(new ValueMapper('id'))
  item.attrMappers.push(new ValueMapper('name', null, 'title'))
  item.attrMappers.push(new ValueMapper('createdAt', null, 'createdAt'))
  item.attrMappers.push(new ValueMapper('updatedAt', null, 'updatedAt'))
  source.itemMappers['entry'] = item
  return source
}

const mockdate = Date.now()

const mockdapter = {
  retrieve: () => Promise.resolve([
    {id: 'item1', title: 'First item', createdAt: mockdate, updatedAt: mockdate},
    {id: 'item2', title: 'Second item', createdAt: mockdate, updatedAt: mockdate}
  ]),

  normalize: (item, path) => Promise.resolve(item)
}

// Tests

test('should exist', (t) => {
  t.is(typeof processSource, 'function')
})

test('should retrieve, map, and return items', async (t) => {
  const source = createSource(mockdapter)
  const expectedAttrs = {name: 'First item'}

  const items = await processSource(source)

  t.true(Array.isArray(items))
  t.is(items.length, 2)
  const item1 = items[0]
  t.is(item1.id, 'item1')
  t.is(item1.type, 'entry')
  t.deepEqual(item1.attributes, expectedAttrs)
  t.is(item1.createdAt, mockdate)
  t.is(item1.updatedAt, mockdate)
})

test('should retrieve, map, and return items with relationship', async (t) => {
  const adapter = {
    retrieve: () => Promise.resolve([
      {id: 'item1', title: 'First item', comments: ['com1', 'com3']},
      {id: 'item2', title: 'Second item', comments: ['com2', 'com4']}
    ]),

    normalize: (item, path) => Promise.resolve(item)
  }
  const source = createSource(adapter)
  source.itemMappers.entry.relMappers.push(new ValueMapper('comments', 'comment', 'comments'))

  const items = await processSource(source)

  t.truthy(items[0].relationships)
  const comments = items[0].relationships.comments
  t.true(Array.isArray(comments))
  t.is(comments[0].id, 'com1')
  t.is(comments[0].type, 'comment')
  t.is(comments[1].id, 'com3')
})

test('should reject when no source definition', async (t) => {
  t.plan(2)

  try {
    await processSource(null)
  } catch (err) {
    t.true(err instanceof Error)
    t.is(err.message, 'No valid source definition')
  }
})

test('should fetch through adapter with endpoint and auth', async (t) => {
  const spydapter = {
    retrieve: sinon.stub().returns(Promise.resolve([])),
    normalize: () => Promise.resolve([])
  }
  const source = createSource(spydapter)

  await processSource(source)

  t.true(spydapter.retrieve.calledOnce)
  t.true(spydapter.retrieve.calledWith(
    source.fetch.endpoint,
    source.fetch.auth
  ))
})

// Tests -- store

test('should store items', async (t) => {
  const source = createSource(mockdapter)
  const dispatch = sinon.stub().returns(Promise.resolve())

  await processSource(source, dispatch)

  t.true(dispatch.calledTwice)
  const action1 = dispatch.args[0][0]
  t.truthy(action1)
  t.is(action1.type, 'SET')
  t.truthy(action1.payload)
  t.is(action1.payload.id, 'item1')
  t.truthy(action1.payload.attributes)
  t.is(action1.payload.attributes.name, 'First item')
})

// Tests -- map item

test('should map item with map pipeline', async (t) => {
  const source = createSource(mockdapter)
  source.itemMappers.entry.map.push({
    from: (item) => {
      const attributes = Object.assign({}, item.attributes, {
        nameid: `${item.attributes.name} (${item.id})`
      })
      return Object.assign({}, item, {attributes})
    }
  })
  source.itemMappers.entry.map.push((item) => {
    const attributes = Object.assign({}, item.attributes, {
      count: Object.keys(item.attributes).length
    })
    return Object.assign({}, item, {attributes})
  })

  const items = await processSource(source)

  t.is(items[0].attributes.nameid, 'First item (item1)')
  t.is(items[0].attributes.count, 2)
})

// Tests -- filter items

test('should filter items', async (t) => {
  const source = createSource(mockdapter)
  source.itemMappers.entry.filters.from.push((item) => item.id === 'item2')

  const items = await processSource(source)

  t.is(items.length, 1)
  t.is(items[0].id, 'item2')
})

test('should filter item through the filter pipeline', async (t) => {
  const source = createSource(mockdapter)
  source.itemMappers.entry.filters.from.push((item) => true)
  source.itemMappers.entry.filters.from.push((item) => false)
  const expected = []

  const items = await processSource(source)

  t.deepEqual(items, expected)
})

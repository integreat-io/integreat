import test from 'ava'
import getProp from 'lodash.get'

import source from '.'

// Helpers

const adapter = {
  normalize: (source, path) => Promise.resolve((path) ? getProp(source, path) : source)
}

// Tests -- mapFromSource

test('should exist', (t) => {
  const src = source('entries', {adapter})

  t.is(typeof src.mapFromSource, 'function')
})

test('should normalize data', async (t) => {
  const data = {
    items: [{id: 'item1'}, {id: 'item2'}]
  }
  const attributes = [{key: 'id'}]
  const items = {entry: {type: 'entry', path: 'items', attributes}}
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'entry')

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'item1')
  t.is(ret[1].id, 'item2')
})

test('should return empty array when no data', async (t) => {
  const items = {entry: {type: 'entry'}}
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(null, 'entry')

  t.deepEqual(ret, [])
})

test('should return empty array when no item type', async (t) => {
  const data = {data: [{id: 'item1'}]}
  const src = source('entries', {adapter})

  const ret = await src.mapFromSource(data, null)

  t.deepEqual(ret, [])
})

test('should return empty array when no matching item type', async (t) => {
  const data = {data: [{id: 'item1', type: 'unknown'}]}
  const items = {entry: {type: 'entry'}}
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'unknown')

  t.deepEqual(ret, [])
})

test('should return empty array when normalize returns null', async (t) => {
  const data = {items: [{id: 'item1'}]}
  const adapter = {
    retrieve: () => Promise.resolve([]),
    normalize: () => Promise.resolve(null)
  }
  const items = {entry: {type: 'entry'}}
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'entry')

  t.deepEqual(ret, [])
})

test('should handle normalize returning object instead of array', async (t) => {
  const data = {items: [{id: 'item1'}]}
  const adapter = {
    retrieve: () => Promise.resolve([]),
    normalize: () => Promise.resolve({id: 'item1'})
  }
  const attributes = [{key: 'id'}]
  const items = {entry: {type: 'entry', attributes}}
  const src = source('entries', {adapter, items})
  const ret = await src.mapFromSource(data, 'entry')

  t.is(ret.length, 1)
  t.is(ret[0].id, 'item1')
})

test('should map attributes', async (t) => {
  const data = {
    items: [{id: 'item1', title: 'First item'}, {id: 'item2', item: 'Second'}]
  }
  const attributes = [
    {key: 'id'},
    {key: 'name', path: 'title'}
  ]
  const items = {entry: {type: 'entry', path: 'items', attributes}}
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'entry')

  t.is(ret[0].id, 'item1')
  t.truthy(ret[0].attributes)
  t.is(ret[0].attributes.name, 'First item')
  t.is(typeof ret[0].attributes.title, 'undefined')
})

test('should include rest values', async (t) => {
  const data = {items: [{id: 'item1', title: 'First item'}]}
  const attributes = [{key: 'id'}, {key: 'name', path: 'title'}]
  const restValues = {
    attributes: {byline: 'Somebody'},
    relationships: {author: {id: 'admin', type: 'user'}}
  }
  const items = {entry: {type: 'entry', path: 'items', attributes, restValues}}
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'entry')

  t.truthy(ret[0].attributes)
  t.is(ret[0].attributes.byline, 'Somebody')
  t.truthy(ret[0].relationships)
  t.deepEqual(ret[0].relationships.author, {id: 'admin', type: 'user'})
})

test('should not include rest values', async (t) => {
  const data = {items: [{id: 'item1', title: 'First item'}]}
  const attributes = [{key: 'id'}, {key: 'name', path: 'title'}]
  const restValues = {
    attributes: {byline: 'Somebody'},
    relationships: {author: {id: 'admin', type: 'user'}}
  }
  const items = {entry: {type: 'entry', path: 'items', attributes, restValues}}
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'entry', {mappedValuesOnly: true})

  t.truthy(ret[0].attributes)
  t.is(ret[0].attributes.byline, undefined)
  t.truthy(ret[0].relationships)
  t.deepEqual(ret[0].relationships.author, undefined)
})

test('should filter items with itemDef', async (t) => {
  const data = {
    items: [{id: 'item1', title: 'First item'}, {id: 'item2', item: 'Second'}]
  }
  const filterFrom = [() => true, () => false]
  const items = {entry: {type: 'entry', path: 'items', filterFrom}}
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'entry')

  t.deepEqual(ret, [])
})

test('should use given path', async (t) => {
  const data = {
    data: {
      items: [{id: 'item1'}, {id: 'item2'}]
    }
  }
  const attributes = [{key: 'id'}]
  const items = {entry: {type: 'entry', path: 'items', attributes}}
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'entry', {path: 'data'})

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'item1')
})

test('should return data with asterisk item', async (t) => {
  const data = [{
    id: 'item1',
    type: 'other',
    attributes: {title: 'Other item'}
  }]
  const items = {'*': {type: '*'}}
  const src = source('store', {adapter, items})

  const ret = await src.mapFromSource(data, 'other')

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'item1')
  t.is(ret[0].type, 'other')
  t.deepEqual(ret[0].attributes, {title: 'Other item'})
})

test('should filter data with asterisk item', async (t) => {
  const data = [{
    id: 'item1',
    type: 'other',
    attributes: {title: 'Other item'}
  }]
  const filterFrom = [() => false]
  const items = {'*': {type: '*', filterFrom}}
  const src = source('store', {adapter, items})

  const ret = await src.mapFromSource(data, 'other')

  t.true(Array.isArray(ret))
  t.is(ret.length, 0)
})

test('should return only items with the right type', async (t) => {
  const data = [{id: 'item1', type: 'other'}, {id: 'item2', type: 'unknown'}]
  const items = {'*': {type: '*'}}
  const src = source('store', {adapter, items})

  const ret = await src.mapFromSource(data, 'other')

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'item1')
})

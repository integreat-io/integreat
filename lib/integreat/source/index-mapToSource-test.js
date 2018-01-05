import test from 'ava'
import datatype from '../datatype'

import source from '.'

// Helpers

const adapter = {}

const datatypes = {
  entry: datatype({
    id: 'entry',
    attributes: {
      type: {},
      name: {}
    },
    relationships: {
      author: {type: 'author'}
    }
  })
}

const addSomething = {to: (item) => Object.assign({something: true}, item)}

// Tests

test('should exist', (t) => {
  const src = source({id: 'entries', adapter})

  t.is(typeof src.mapToSource, 'function')
})

test('should serialize data', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const attributes = {id: {}, type: {}}
  const mappings = {entry: {type: 'entry', path: 'data', attributes}}
  const src = source({id: 'entries', adapter, mappings}, {datatypes})

  const ret = await src.mapToSource(data)

  t.truthy(ret)
  t.truthy(ret.data)
  t.is(ret.data.id, 'ent1')
  t.is(ret.data.type, 'entry')
})

test('should return null when no matching item def', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const src = source({id: 'entries', adapter})

  const ret = await src.mapToSource(data)

  t.is(ret, null)
})

test('should return null when no data', async (t) => {
  const attributes = {id: {}}
  const mappings = {entry: {type: 'entry', path: 'data', attributes}}
  const src = source({id: 'entries', adapter, mappings}, {datatypes})

  const ret = await src.mapToSource()

  t.is(ret, null)
})

test('should map item', async (t) => {
  const data = {
    id: 'ent1',
    type: 'entry',
    attributes: {name: 'Entry 1'},
    relationships: {author: 'johnf'}
  }
  const mappings = {entry: {
    type: 'entry',
    path: 'data',
    attributes: {
      id: {},
      type: {},
      name: {path: 'title'}
    },
    relationships: {
      author: {path: 'author'}
    }
  }}
  const src = source({id: 'entries', adapter, mappings}, {datatypes})

  const ret = await src.mapToSource(data)

  t.truthy(ret.data)
  t.is(ret.data.id, 'ent1')
  t.is(ret.data.type, 'entry')
  t.is(ret.data.title, 'Entry 1')
  t.is(ret.data.author, 'johnf')
  t.is(ret.data.attributes, undefined)
  t.is(ret.data.relationships, undefined)
})

test('should filter item with itemDef', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const filterTo = [() => true, () => false]
  const attributes = {id: {}}
  const mappings = {entry: {type: 'entry', path: 'data', attributes, filterTo}}
  const src = source({id: 'entries', adapter, mappings}, {datatypes})

  const ret = await src.mapToSource(data)

  t.is(ret, null)
})

test('should return data with asterisk item', async (t) => {
  const data = {id: 'ent1', type: 'other'}
  const mappings = {'*': {type: '*'}}
  const datatypes = {other: datatype({id: 'other'})}
  const src = source({id: 'store', adapter, mappings}, {datatypes})

  const ret = await src.mapToSource(data)

  t.truthy(ret)
  t.is(ret.id, 'ent1')
  t.is(ret.type, 'other')
})

test('should return empty array when asterisk but no datatype', async (t) => {
  const data = [{id: 'ent1', type: 'other'}]
  const mappings = {'*': {type: '*'}}
  const datatypes = {}
  const src = source({id: 'store', adapter, mappings}, {datatypes})

  const ret = await src.mapToSource(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 0)
})

test('should return null when data has no type', async (t) => {
  const data = {id: 'ent1'}
  const mappings = {'*': {type: '*'}}
  const src = source({id: 'entries', adapter, mappings})

  const ret = await src.mapToSource(data)

  t.is(ret, null)
})

test('should map array of data', async (t) => {
  const data = [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}]
  const attributes = {id: {}, type: {}}
  const mappings = {entry: {type: 'entry', attributes}}
  const src = source({id: 'entries', adapter, mappings}, {datatypes})

  const ret = await src.mapToSource(data)

  t.truthy(ret)
  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'ent1')
  t.is(ret[0].type, 'entry')
  t.is(ret[1].id, 'ent2')
  t.is(ret[1].type, 'entry')
})

test('should include all default values from type', async (t) => {
  const data = [{id: 'item1', type: 'entry', attributes: {name: 'The title'}}]
  const attributes = {id: 'id', name: 'title', status: 'status'}
  const relationships = {author: 'author.id'}
  const mappings = {entry: {type: 'entry', path: 'item', attributes, relationships}}
  const datatypes = {
    entry: datatype({
      id: 'entry',
      attributes: {
        name: {default: 'Default name'},
        status: {default: 'Draft'}
      },
      relationships: {
        author: {type: 'user', default: 'admin'}
      }
    })
  }
  const src = source({id: 'entries', adapter, mappings}, {datatypes})

  const ret = await src.mapToSource(data, {useDefaults: true})

  t.truthy(ret[0].item)
  const item = ret[0].item
  t.is(item.id, 'item1')
  t.is(item.title, 'The title')
  t.is(item.status, 'Draft')
  t.deepEqual(item.author, {id: 'admin'})
})

// Tests -- metadata

test('should provide meta mapping when handling meta', async (t) => {
  const lastSyncedAt = new Date()
  const data = {id: 'entries', type: 'meta', attributes: {lastSyncedAt}}
  const datatypes = {meta: datatype({id: 'meta', attributes: {lastSyncedAt: 'date'}})}
  const src = source({id: 'store', adapter, handleMeta: true}, {datatypes})

  const ret = await src.mapToSource(data)

  t.truthy(ret)
  t.is(ret.id, 'entries')
  t.is(ret.type, 'meta')
  t.deepEqual(ret.attributes.lastSyncedAt, lastSyncedAt)
})

test('should not provide meta mapping when not handling meta', async (t) => {
  const lastSyncedAt = Date.now()
  const data = {id: 'entries', type: 'meta', attributes: {lastSyncedAt}}
  const src = source({id: 'store', adapter, handleMeta: false})

  const ret = await src.mapToSource(data)

  t.falsy(ret)
})

test('should not provide meta mapping when one already exists', async (t) => {
  const lastSyncedAt = Date.now()
  const data = {id: 'entries', type: 'meta', attributes: {lastSyncedAt}}
  const mappings = {'meta': {type: 'meta', transform: [addSomething]}}
  const datatypes = {meta: datatype({id: 'meta'})}
  const src = source({id: 'store', adapter, handleMeta: true, mappings}, {datatypes})

  const ret = await src.mapToSource(data)

  t.truthy(ret)
  t.true(ret.something)
})

test('should not provide meta mapping when an asterisk mapping exists', async (t) => {
  const lastSyncedAt = Date.now()
  const data = {id: 'entries', type: 'meta', attributes: {lastSyncedAt}}
  const mappings = {'*': {type: '*', transform: [addSomething]}}
  const datatypes = {meta: datatype({id: 'meta'})}
  const src = source({id: 'store', adapter, handleMeta: true, mappings}, {datatypes})

  const ret = await src.mapToSource(data)

  t.truthy(ret)
  t.true(ret.something)
})

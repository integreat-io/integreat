import test from 'ava'
import datatype from '../datatype'
import {set as setPath} from '../../utils/path'

import source from '.'

// Helpers

const adapter = {
  serialize: (data, path) => {
    // const serialize = (item) => Object.assign({}, item, {_id: item.id})
    // const ser = Array.isArray(data) ? data.map(serialize) : serialize(data)
    return (path) ? setPath({}, path, data) : data
  }
}

const datatypes = {
  entry: datatype({
    id: 'entry',
    attributes: {
      type: {},
      name: {}
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
  const data = {id: 'ent1', type: 'entry', attributes: {name: 'Entry 1'}}
  const attributes = {
    id: {},
    type: {},
    name: {path: 'title'}
  }
  const mappings = {entry: {type: 'entry', path: 'data', attributes}}
  const src = source({id: 'entries', adapter, mappings}, {datatypes})

  const ret = await src.mapToSource(data)

  t.truthy(ret.data)
  t.is(ret.data.title, 'Entry 1')
  t.is(ret.data.attributes, undefined)
  t.is(ret.data.type, 'entry')
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

test('should use given path', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const attributes = {id: {}}
  const mappings = {entry: {type: 'entry', path: 'data', attributes}}
  const src = source({id: 'entries', adapter, mappings}, {datatypes})

  const ret = await src.mapToSource(data, ['base'])

  t.truthy(ret)
  t.truthy(ret.base)
  t.truthy(ret.base.data)
  t.is(ret.base.data.id, 'ent1')
})

test('should return data with asterisk item', async (t) => {
  const data = {id: 'ent1', type: 'other'}
  const mappings = {'*': {type: '*'}}
  const src = source({id: 'store', adapter, mappings})

  const ret = await src.mapToSource(data)

  t.truthy(ret)
  t.is(ret.id, 'ent1')
  t.is(ret.type, 'other')
})

test('should return null when data has no type', async (t) => {
  const data = {id: 'ent1'}
  const mappings = {'*': {type: '*'}}
  const src = source({id: 'entries', adapter, mappings})

  const ret = await src.mapToSource(data)

  t.is(ret, null)
})

test('should serialize array of data', async (t) => {
  const data = [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}]
  const attributes = {id: {}, type: {}}
  const mappings = {entry: {type: 'entry', attributes}}
  const src = source({id: 'entries', adapter, mappings}, {datatypes})

  const ret = await src.mapToSource(data, ['data'])

  t.truthy(ret)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 2)
  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[0].type, 'entry')
  t.is(ret.data[1].id, 'ent2')
  t.is(ret.data[1].type, 'entry')
})

// Tests -- metadata

test('should provide meta mapping when handling meta', async (t) => {
  const lastSyncedAt = Date.now()
  const data = {id: 'entries', type: 'meta', attributes: {lastSyncedAt}}
  const src = source({id: 'store', adapter, handleMeta: true})

  const ret = await src.mapToSource(data)

  t.truthy(ret)
  t.is(ret.id, 'entries')
  t.is(ret.type, 'meta')
  t.is(ret.attributes.lastSyncedAt, lastSyncedAt)
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
  const src = source({id: 'store', adapter, handleMeta: true, mappings})

  const ret = await src.mapToSource(data)

  t.truthy(ret)
  t.true(ret.something)
})

test('should not provide meta mapping when an asterisk mapping exists', async (t) => {
  const lastSyncedAt = Date.now()
  const data = {id: 'entries', type: 'meta', attributes: {lastSyncedAt}}
  const mappings = {'*': {type: '*', transform: [addSomething]}}
  const src = source({id: 'store', adapter, handleMeta: true, mappings})

  const ret = await src.mapToSource(data)

  t.truthy(ret)
  t.true(ret.something)
})

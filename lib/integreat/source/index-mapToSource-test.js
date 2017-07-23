import test from 'ava'
import datatype from '../datatype'
import {set as setPath} from '../../utils/path'

import source from '.'

// Helpers

const adapter = {
  serialize: (data, path) => {
    const ser = Object.assign({}, data, {_id: data.id})
    return (path) ? setPath({}, path, ser) : ser
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
  t.is(ret.data._id, 'ent1')
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

  const ret = await src.mapToSource(data, 'base')

  t.truthy(ret)
  t.truthy(ret.base)
  t.truthy(ret.base.data)
  t.is(ret.base.data._id, 'ent1')
})

test('should return data with asterisk item', async (t) => {
  const data = {id: 'ent1', type: 'other'}
  const mappings = {'*': {type: '*'}}
  const src = source({id: 'store', adapter, mappings})

  const ret = await src.mapToSource(data)

  t.truthy(ret)
  t.is(ret._id, 'ent1')
  t.is(ret.type, 'other')
})

test('should return null when data has no type', async (t) => {
  const data = {id: 'ent1'}
  const mappings = {'*': {type: '*'}}
  const src = source({id: 'entries', adapter, mappings})

  const ret = await src.mapToSource(data)

  t.is(ret, null)
})

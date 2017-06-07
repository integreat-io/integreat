import test from 'ava'
import dotProp from 'dot-prop'

import source from '.'

// Helpers

const adapter = {
  serialize: (data, path) => {
    const obj = {}
    dotProp.set(obj, path, Object.assign({}, data, {_id: data.id}))
    return obj
  }
}

// Tests

test('should exist', (t) => {
  const src = source('entries', {adapter})

  t.is(typeof src.mapToSource, 'function')
})

test('should serialize data', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const attrs = [
    {key: 'id'},
    {key: 'type'}
  ]
  const items = [{type: 'entry', path: 'data', attrs}]
  const src = source('entries', {adapter, items})

  const ret = await src.mapToSource(data)

  t.truthy(ret)
  t.truthy(ret.data)
  t.is(ret.data._id, 'ent1')
  t.is(ret.data.type, 'entry')
})

test('should return null when no matching item def', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const src = source('entries', {adapter})

  const ret = await src.mapToSource(data)

  t.is(ret, null)
})

test('should return null when no data', async (t) => {
  const attrs = [{key: 'id'}]
  const items = [{type: 'entry', path: 'data', attrs}]
  const src = source('entries', {adapter, items})

  const ret = await src.mapToSource()

  t.is(ret, null)
})

test('should map item', async (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {name: 'Entry 1'}}
  const attrs = [
    {key: 'id'},
    {key: 'type'},
    {key: 'name', path: 'title'}
  ]
  const items = [{type: 'entry', path: 'data', attrs}]
  const src = source('entries', {adapter, items})

  const ret = await src.mapToSource(data)

  t.truthy(ret.data)
  t.is(ret.data.title, 'Entry 1')
  t.is(ret.data.attributes, undefined)
  t.is(ret.data.type, 'entry')
})

test('should filter item with itemDef', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const filterTo = [() => true, () => false]
  const attrs = [{key: 'id'}]
  const items = [{type: 'entry', path: 'data', attrs, filterTo}]
  const src = source('entries', {adapter, items})

  const ret = await src.mapToSource(data)

  t.is(ret, null)
})

test('should use given path', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const attrs = [{key: 'id'}]
  const items = [{type: 'entry', path: 'data', attrs}]
  const src = source('entries', {adapter, items})

  const ret = await src.mapToSource(data, 'base')

  t.truthy(ret)
  t.truthy(ret.base)
  t.truthy(ret.base.data)
  t.is(ret.base.data._id, 'ent1')
})

import test from 'ava'

import create from './create'

// Tests

test('should exist', (t) => {
  t.is(typeof create, 'function')
})

test('should return Source instance', (t) => {
  const sourceDef = {id: 'entry1'}

  const ret = create(sourceDef)

  t.is(ret.constructor.name, 'Source')
  t.is(ret.id, 'entry1')
})

test('should return null when no source def is given', (t) => {
  const ret = create()

  t.is(ret, null)
})

test('should return null when no id', (t) => {
  const ret = create({})

  t.is(ret, null)
})

// Tests -- adapter

test('should set adapter', (t) => {
  const adapter = {}
  const getAdapter = (type) => (type === 'json') ? adapter : null
  const sourceDef = {
    id: 'entry1',
    adapter: 'json'
  }

  const ret = create(sourceDef, getAdapter)

  t.is(ret.adapter, adapter)
})

// Tests -- sync

test('should set sync properties', (t) => {
  const sync = {
    schedule: 3600,
    allowRelay: true,
    allowPush: true
  }
  const sourceDef = {
    id: 'entry1',
    sync
  }

  const ret = create(sourceDef)

  t.is(ret.schedule, 3600)
  t.true(ret.allowRelay)
  t.true(ret.allowPush)
  t.is(ret.nextSync, null)
})

test('should not set non-standard sync properties', (t) => {
  const sync = {
    not: 'standard'
  }
  const sourceDef = {
    id: 'entry1',
    sync
  }

  const ret = create(sourceDef)

  t.is(ret.not, undefined)
})

// Tests -- fetch

test('should set fetch properties', (t) => {
  const fetch = {
    endpoint: 'http://some.url/end',
    changelog: 'http://some.url/change',
    path: 'some.path'
  }
  const sourceDef = {
    id: 'entry1',
    fetch
  }

  const ret = create(sourceDef)

  t.is(ret.fetch.endpoint, 'http://some.url/end')
  t.is(ret.fetch.changelog, 'http://some.url/change')
  t.is(ret.fetch.path, 'some.path')
})

test('should not set non-standard fetch properties', (t) => {
  const sourceDef = {
    id: 'entry1',
    fetch: {not: 'standard'}
  }

  const ret = create(sourceDef)

  t.is(ret.fetch.not, undefined)
})

test('should set fetch.map pipeline', (t) => {
  const map = [() => '1', () => '2']
  const sourceDef = {
    id: 'entry1',
    fetch: {map}
  }

  const ret = create(sourceDef)

  t.is(ret.fetch.map.length, 2)
  t.is(ret.fetch.map[0](), '1')
  t.is(ret.fetch.map[1](), '2')
})

test('should not set null on fetch.map pipeline', (t) => {
  const map = [null]
  const sourceDef = {
    id: 'entry1',
    fetch: {map}
  }

  const ret = create(sourceDef)

  t.is(ret.fetch.map.length, 0)
})

test('should set mapper on fetch.map from key', (t) => {
  const map = [() => '1', 'two']
  const sourceDef = {
    id: 'entry1',
    fetch: {map}
  }
  const getMapper = (key) => (key === 'two') ? () => '2' : null

  const ret = create(sourceDef, null, getMapper)

  t.is(ret.fetch.map.length, 2)
  t.is(ret.fetch.map[0](), '1')
  t.is(typeof ret.fetch.map[1], 'function')
  t.is(ret.fetch.map[1](), '2')
})

test('should not set mapper on fetch.map from unknown key', (t) => {
  const map = ['unknown']
  const sourceDef = {
    id: 'entry1',
    fetch: {map}
  }
  const getMapper = (key) => null

  const ret = create(sourceDef, null, getMapper)

  t.is(ret.fetch.map.length, 0)
})

test('should not set mapper on fetch.map from key when no getMapper', (t) => {
  const map = ['two']
  const sourceDef = {
    id: 'entry1',
    fetch: {map}
  }

  const ret = create(sourceDef)

  t.is(ret.fetch.map.length, 0)
})

test('should set fetch.filter pipeline', (t) => {
  const filter = [() => true, 'two', null, 'unknown']
  const sourceDef = {
    id: 'entry1',
    fetch: {filter}
  }
  const getFilter = (key) => (key === 'two') ? () => false : null

  const ret = create(sourceDef, null, null, getFilter)

  t.is(ret.fetch.filter.length, 2)
  t.true(ret.fetch.filter[0]())
  t.false(ret.fetch.filter[1]())
})

test('should set fetch auth strategy', (t) => {
  const auth = {}
  const getAuth = (id) => (id === 'twitter') ? auth : null
  const sourceDef = {
    id: 'entry1',
    fetch: {auth: 'twitter'}
  }

  const ret = create(sourceDef, null, null, null, getAuth)

  t.is(ret.fetch.auth, auth)
})

// Tests -- send

test('should set send properties', (t) => {
  const send = {
    endpoint: 'http://some.url/end'
  }
  const sourceDef = {
    id: 'entry1',
    send
  }

  const ret = create(sourceDef)

  t.is(ret.send.endpoint, 'http://some.url/end')
})

test('should not set non-standard send properties', (t) => {
  const sourceDef = {
    id: 'entry1',
    send: {not: 'standard'}
  }

  const ret = create(sourceDef)

  t.is(ret.send.not, undefined)
})

test('should set mapper on send.map', (t) => {
  const map = [() => '1', 'two', null, 'unknown']
  const sourceDef = {
    id: 'entry1',
    send: {map}
  }
  const getMapper = (key) => (key === 'two') ? () => '2' : null

  const ret = create(sourceDef, null, getMapper)

  t.is(ret.send.map.length, 2)
  t.is(ret.send.map[0](), '1')
  t.is(typeof ret.send.map[1], 'function')
  t.is(ret.send.map[1](), '2')
})

test('should set send auth strategy', (t) => {
  const auth = {}
  const getAuth = (id) => (id === 'twitter') ? auth : null
  const sourceDef = {
    id: 'entry1',
    send: {auth: 'twitter'}
  }

  const ret = create(sourceDef, null, null, null, getAuth)

  t.is(ret.send.auth, auth)
})

// Tests -- item

test('should set item.type', (t) => {
  const sourceDef = {
    id: 'entry1',
    item: {type: 'entry'}
  }

  const ret = create(sourceDef)

  t.is(ret.item.type, 'entry')
})

test('should set mapper on item.map', (t) => {
  const map = [() => '1', 'two', null, 'unknown']
  const sourceDef = {
    id: 'entry1',
    item: {map}
  }
  const getMapper = (key) => (key === 'two') ? () => '2' : null

  const ret = create(sourceDef, null, getMapper)

  t.is(ret.item.map.length, 2)
  t.is(ret.item.map[0](), '1')
  t.is(typeof ret.item.map[1], 'function')
  t.is(ret.item.map[1](), '2')
})

test('should set item.filter pipeline', (t) => {
  const filter = [() => true, 'two', null, 'unknown']
  const sourceDef = {
    id: 'entry1',
    item: {filter}
  }
  const getFilter = (key) => (key === 'two') ? () => false : null

  const ret = create(sourceDef, null, null, getFilter)

  t.is(ret.item.filter.length, 2)
  t.true(ret.item.filter[0]())
  t.false(ret.item.filter[1]())
})

// Tests -- attributes

test('should set attributes', (t) => {
  const attributes = {
    'id': {path: 'some.path'},
    'age': {type: 'integer', path: 'other.path', defaultValue: 0}
  }
  const sourceDef = {
    id: 'entry1',
    item: {attributes}
  }

  const ret = create(sourceDef)

  t.is(ret.attributes.length, 2)
  const attr1 = ret.attributes[0]
  t.is(attr1.constructor.name, 'Attribute')
  t.is(attr1.key, 'id')
  t.is(attr1.type, 'string')
  t.is(attr1.path, 'some.path')
  t.is(attr1.defaultValue, null)
  const attr2 = ret.attributes[1]
  t.is(attr2.key, 'age')
  t.is(attr2.type, 'integer')
  t.is(attr2.path, 'other.path')
  t.is(attr2.defaultValue, 0)
})

test('should not set attribute with no def', (t) => {
  const attributes = {'none': null}
  const sourceDef = {
    id: 'entry1',
    item: {attributes}
  }

  const ret = create(sourceDef)

  t.is(ret.attributes.length, 0)
})

test('should set attribute mapper', (t) => {
  const map = [() => '1', 'two', null, 'unknown']
  const attributes = {'name': {path: 'some.path', map}}
  const sourceDef = {
    id: 'entry1',
    item: {attributes}
  }
  const getMapper = (key) => (key === 'two') ? () => '2' : null

  const ret = create(sourceDef, null, getMapper)

  const attr1 = ret.attributes[0]
  t.is(typeof attr1.map[0], 'function')
  t.is(attr1.map[0](), '1')
  t.is(typeof attr1.map[1], 'function')
  t.is(attr1.map[1](), '2')
})

test('should add attribute type as mapper', (t) => {
  const map = [() => '1']
  const attributes = {'name': {path: 'some.path', type: 'string', map}}
  const sourceDef = {
    id: 'entry1',
    item: {attributes}
  }
  const getMapper = (key) => (key === 'string') ? () => 'A string' : null

  const ret = create(sourceDef, null, getMapper)

  const attr1 = ret.attributes[0]
  t.is(attr1.map.length, 2)
  t.is(typeof attr1.map[1], 'function')
  t.is(attr1.map[1](), 'A string')
})

test('should set default type date for createdAt and updateAt', (t) => {
  const attributes = {
    'createdAt': {path: 'createdAt'},
    'updatedAt': {path: 'updatedAt'}
  }
  const sourceDef = {
    id: 'entry1',
    item: {attributes}
  }

  const ret = create(sourceDef)

  const attr1 = ret.attributes[0]
  const attr2 = ret.attributes[1]
  t.is(attr1.type, 'date')
  t.is(attr2.type, 'date')
})

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
    changelog: 'http://some.url/change'
  }
  const sourceDef = {
    id: 'entry1',
    fetch
  }

  const ret = create(sourceDef)

  t.is(ret.fetch.endpoint, 'http://some.url/end')
  t.is(ret.fetch.changelog, 'http://some.url/change')
})

test('should not set non-standard fetch properties', (t) => {
  const sourceDef = {
    id: 'entry1',
    fetch: {not: 'standard'}
  }

  const ret = create(sourceDef)

  t.is(ret.fetch.not, undefined)
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

// Tests -- items

test('should create Item', (t) => {
  const sourceDef = {
    id: 'entry1',
    items: [{type: 'entry', path: 'the.path'}]
  }

  const ret = create(sourceDef)

  const item = ret.items.entry
  t.truthy(item)
  t.is(item.constructor.name, 'Item')
  t.is(item.type, 'entry')
  t.is(item.path, 'the.path')
})

test('should set mapper on item.map', (t) => {
  const map = [() => '1', 'two', null, 'unknown']
  const sourceDef = {id: 'entry1', items: [{type: 'entry', map}]}
  const getMapper = (key) => (key === 'two') ? () => '2' : null

  const ret = create(sourceDef, null, getMapper)

  const item = ret.items.entry
  t.is(item.map.length, 2)
  t.is(item.map[0](), '1')
  t.is(typeof item.map[1], 'function')
  t.is(item.map[1](), '2')
})

test('should set item.filters.from pipeline', (t) => {
  const filter = [() => true, 'two', null, 'unknown']
  const sourceDef = {id: 'entry1', items: [{type: 'entry', filter}]}
  const getFilter = (key) => (key === 'two') ? () => false : null

  const ret = create(sourceDef, null, null, getFilter)

  const item = ret.items.entry
  t.is(item.filters.from.length, 2)
  t.true(item.filters.from[0]())
  t.false(item.filters.from[1]())
})

test('should set item.filters.from pipeline from from-param', (t) => {
  const filter = {from: [() => true, 'two', null, 'unknown']}
  const sourceDef = {id: 'entry1', items: [{type: 'entry', filter}]}
  const getFilter = (key) => (key === 'two') ? () => false : null

  const ret = create(sourceDef, null, null, getFilter)

  const item = ret.items.entry
  t.is(item.filters.from.length, 2)
  t.true(item.filters.from[0]())
  t.false(item.filters.from[1]())
})

test('should set item.filters.to pipeline from to-param', (t) => {
  const filter = {to: [() => true, 'two', null, 'unknown']}
  const sourceDef = {id: 'entry1', items: [{type: 'entry', filter}]}
  const getFilter = (key) => (key === 'two') ? () => false : null

  const ret = create(sourceDef, null, null, getFilter)

  const item = ret.items.entry
  t.is(item.filters.to.length, 2)
  t.true(item.filters.to[0]())
  t.false(item.filters.to[1]())
})

// Tests -- attributes

test('should set attributes', (t) => {
  const attributes = {
    'id': {path: 'some.path'},
    'age': {type: 'integer', path: 'other.path', defaultFrom: 0, defaultTo: 18}
  }
  const sourceDef = {
    id: 'entry1',
    items: [{type: 'entry', attributes}]
  }

  const ret = create(sourceDef)

  const attrs = ret.items.entry.attributes
  t.is(attrs.length, 2)
  const attr1 = attrs[0]
  t.is(attr1.constructor.name, 'Attribute')
  t.is(attr1.key, 'id')
  t.is(attr1.type, 'string')
  t.is(attr1.path, 'some.path')
  t.is(attr1.defaultFrom, null)
  t.is(attr1.defaultTo, null)
  const attr2 = attrs[1]
  t.is(attr2.key, 'age')
  t.is(attr2.type, 'integer')
  t.is(attr2.path, 'other.path')
  t.is(attr2.defaultFrom, 0)
  t.is(attr2.defaultTo, 18)
})

test('should not set attribute with no def', (t) => {
  const attributes = {'none': null}
  const sourceDef = {
    id: 'entry1',
    items: [{type: 'entry', attributes}]
  }

  const ret = create(sourceDef)

  t.is(ret.items.entry.attributes.length, 0)
})

test('should set attribute mapper', (t) => {
  const map = [() => '1', 'two', null, 'unknown']
  const attributes = {'name': {path: 'some.path', map}}
  const sourceDef = {
    id: 'entry1',
    items: [{type: 'entry', attributes}]
  }
  const getMapper = (key) => (key === 'two') ? () => '2' : null

  const ret = create(sourceDef, null, getMapper)

  const map1 = ret.items.entry.attributes[0].map
  t.is(map1.length, 2)
  t.is(typeof map1[0], 'function')
  t.is(map1[0](), '1')
  t.is(typeof map1[1], 'function')
  t.is(map1[1](), '2')
})

test('should not include mapper ids when no getMapper function', (t) => {
  const map = ['validMapper']
  const attributes = {'name': {path: 'some.path', map}}
  const sourceDef = {
    id: 'entry1',
    items: [{type: 'entry', attributes}]
  }

  const ret = create(sourceDef)

  const map1 = ret.items.entry.attributes[0].map
  t.is(map1.length, 0)
})

test('should add attribute type as mapper', (t) => {
  const map = [() => '1']
  const attributes = {'name': {path: 'some.path', type: 'string', map}}
  const sourceDef = {
    id: 'entry1',
    items: [{type: 'entry', attributes}]
  }
  const getMapper = (key) => (key === 'string') ? () => 'A string' : null

  const ret = create(sourceDef, null, getMapper)

  const attr1 = ret.items.entry.attributes[0]
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
    items: [{type: 'entry', attributes}]
  }

  const ret = create(sourceDef)

  const attrs = ret.items.entry.attributes
  t.is(attrs[0].type, 'date')
  t.is(attrs[1].type, 'date')
})

test('should add date mapper when defaulting to date type', (t) => {
  const attributes = {'createdAt': {path: 'createdAt'}}
  const sourceDef = {id: 'entry1', items: [{type: 'entry', attributes}]}
  const getMapper = (key) => (key === 'date') ? () => 'A date' : null

  const ret = create(sourceDef, null, getMapper)

  const map = ret.items.entry.attributes[0].map
  t.is(map.length, 1)
  t.is(typeof map[0], 'function')
  t.is(map[0](), 'A date')
})

test('should map arrays', (t) => {
  const attributes = {allIds: {path: 'some.path', type: 'integer[]'}}
  const sourceDef = {id: 'entry1', items: [{type: 'entry', attributes}]}
  const getMapper = (key) => (key === 'integer') ? (value) => Number.parseInt(value, 10) : null
  const source = ['3', '18', '64']
  const expected = [3, 18, 64]

  const ret = create(sourceDef, null, getMapper)
  const attr = ret.items.entry.attributes[0]
  const target = attr.fromSource(source)

  t.deepEqual(target, expected)
})

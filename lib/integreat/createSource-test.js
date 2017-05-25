import test from 'ava'

import create from './createSource'

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

test('should set adapter', (t) => {
  const adapter = {}
  const adapters = {json: adapter}
  const sourceDef = {
    id: 'entry1',
    adapter: 'json'
  }

  const ret = create(sourceDef, {adapters})

  t.is(ret.adapter, adapter)
})

test('should set baseUri', (t) => {
  const sourceDef = {
    id: 'entries',
    baseUri: 'http://api1.test/'
  }

  const ret = create(sourceDef)

  t.is(ret.baseUri, 'http://api1.test/')
})

test('should set endpoints', (t) => {
  const sourceDef = {
    id: 'entries',
    endpoints: {
      one: 'http://api1.test/one',
      all: 'http://api1.test/all',
      some: 'http://api1.test/some',
      send: 'http://api1.test/send'
    }
  }

  const ret = create(sourceDef)

  t.is(ret.endpoints.one, 'http://api1.test/one')
  t.is(ret.endpoints.all, 'http://api1.test/all')
  t.is(ret.endpoints.some, 'http://api1.test/some')
  t.is(ret.endpoints.send, 'http://api1.test/send')
})

test('should set auth strategy', (t) => {
  const auth = {}
  const auths = {twitter: auth}
  const sourceDef = {
    id: 'entry1',
    auth: 'twitter'
  }

  const ret = create(sourceDef, {auths})

  t.is(ret.auth, auth)
})

// Tests -- items

test('should create item mapper', (t) => {
  const sourceDef = {
    id: 'entry1',
    items: [{type: 'entry', path: 'the.path'}]
  }

  const ret = create(sourceDef)

  const item = ret.itemMappers.entry
  t.truthy(item)
  t.is(item.constructor.name, 'ItemMapper')
  t.is(item.type, 'entry')
  t.is(item.path, 'the.path')
})

test('should map several item mappers', (t) => {
  const sourceDef = {
    id: 'entries',
    items: [
      {type: 'entry', path: 'the.path'},
      {type: 'item', path: 'another.path'}
    ]
  }

  const ret = create(sourceDef)

  const item1 = ret.itemMappers.entry
  t.truthy(item1)
  t.is(item1.type, 'entry')
  t.is(item1.path, 'the.path')
  const item2 = ret.itemMappers.item
  t.truthy(item2)
  t.is(item2.type, 'item')
  t.is(item2.path, 'another.path')
})

test('should set mapper on item.map', (t) => {
  const map = [() => '1', 'two', null, 'unknown']
  const sourceDef = {id: 'entry1', items: [{type: 'entry', map}]}
  const mappers = {two: () => '2'}

  const ret = create(sourceDef, {mappers})

  const item = ret.itemMappers.entry
  t.is(item.map.length, 2)
  t.is(item.map[0](), '1')
  t.is(typeof item.map[1], 'function')
  t.is(item.map[1](), '2')
})

test('should set item.filters.from pipeline', (t) => {
  const filter = [() => true, 'two', null, 'unknown']
  const sourceDef = {id: 'entry1', items: [{type: 'entry', filter}]}
  const filters = {two: () => false}

  const ret = create(sourceDef, {filters})

  const item = ret.itemMappers.entry
  t.is(item.filters.from.length, 2)
  t.true(item.filters.from[0]())
  t.false(item.filters.from[1]())
})

test('should set item.filters.from pipeline from from-param', (t) => {
  const filter = {from: [() => true, 'two', null, 'unknown']}
  const sourceDef = {id: 'entry1', items: [{type: 'entry', filter}]}
  const filters = {two: () => false}

  const ret = create(sourceDef, {filters})

  const item = ret.itemMappers.entry
  t.is(item.filters.from.length, 2)
  t.true(item.filters.from[0]())
  t.false(item.filters.from[1]())
})

test('should set item.filters.to pipeline from to-param', (t) => {
  const filter = {to: [() => true, 'two', null, 'unknown']}
  const sourceDef = {id: 'entry1', items: [{type: 'entry', filter}]}
  const filters = {two: () => false}

  const ret = create(sourceDef, {filters})

  const item = ret.itemMappers.entry
  t.is(item.filters.to.length, 2)
  t.true(item.filters.to[0]())
  t.false(item.filters.to[1]())
})

// Tests -- attributes

test('should set attribute mappers', (t) => {
  const attributes = {
    'id': {path: 'some.path'},
    'age': {type: 'integer', path: 'other.path', default: {from: 0, to: 18}}
  }
  const sourceDef = {id: 'entry1', items: [{type: 'entry', attributes}]}

  const ret = create(sourceDef)

  const attrs = ret.itemMappers.entry.attrMappers
  t.is(attrs.length, 2)
  const attr1 = attrs[0]
  t.is(attr1.constructor.name, 'ValueMapper')
  t.is(attr1.key, 'id')
  t.is(attr1.type, 'string')
  t.is(attr1.path, 'some.path')
  t.is(attr1.default.from, null)
  t.is(attr1.default.to, null)
  const attr2 = attrs[1]
  t.is(attr2.key, 'age')
  t.is(attr2.type, 'integer')
  t.is(attr2.path, 'other.path')
  t.is(attr2.default.from, 0)
  t.is(attr2.default.to, 18)
})

test('should set attribute mappers with single value default', (t) => {
  const attributes = {
    'age': {type: 'integer', path: 'other.path', default: 37}
  }
  const sourceDef = {id: 'entry1', items: [{type: 'entry', attributes}]}

  const ret = create(sourceDef)

  const attr = ret.itemMappers.entry.attrMappers[0]
  t.is(attr.default.from, 37)
})

test('should set attribute mapper with no def', (t) => {
  const attributes = {'none': null}
  const sourceDef = {
    id: 'entry1',
    items: [{type: 'entry', attributes}]
  }

  const ret = create(sourceDef)

  t.is(ret.itemMappers.entry.attrMappers.length, 1)
  const attr = ret.itemMappers.entry.attrMappers[0]
  t.is(attr.type, 'string')
  t.is(attr.path, 'none')   // Coming from ValueMapper
})

test('should set map pipeline of attribute mapper', (t) => {
  const map = [() => '1', 'two', null, 'unknown']
  const attributes = {'name': {path: 'some.path', map}}
  const sourceDef = {
    id: 'entry1',
    items: [{type: 'entry', attributes}]
  }
  const mappers = {two: () => '2'}

  const ret = create(sourceDef, {mappers})

  const map1 = ret.itemMappers.entry.attrMappers[0].map
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

  const map1 = ret.itemMappers.entry.attrMappers[0].map
  t.is(map1.length, 0)
})

test('should add attribute type as mapper', (t) => {
  const map = [() => '1']
  const attributes = {'name': {path: 'some.path', type: 'string', map}}
  const sourceDef = {
    id: 'entry1',
    items: [{type: 'entry', attributes}]
  }
  const mappers = {string: () => 'A string'}

  const ret = create(sourceDef, {mappers})

  const attr1 = ret.itemMappers.entry.attrMappers[0]
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

  const attrs = ret.itemMappers.entry.attrMappers
  t.is(attrs[0].type, 'date')
  t.is(attrs[1].type, 'date')
})

test('should add date mapper when defaulting to date type', (t) => {
  const attributes = {'createdAt': {path: 'createdAt'}}
  const sourceDef = {id: 'entry1', items: [{type: 'entry', attributes}]}
  const mappers = {date: () => 'A date'}

  const ret = create(sourceDef, {mappers})

  const map = ret.itemMappers.entry.attrMappers[0].map
  t.is(map.length, 1)
  t.is(typeof map[0], 'function')
  t.is(map[0](), 'A date')
})

test('should map arrays', (t) => {
  const attributes = {allIds: {path: 'some.path', type: 'integer[]'}}
  const sourceDef = {id: 'entry1', items: [{type: 'entry', attributes}]}
  const mappers = {integer: (value) => Number.parseInt(value, 10)}
  const source = ['3', '18', '64']
  const expected = [3, 18, 64]

  const ret = create(sourceDef, {mappers})
  const attr = ret.itemMappers.entry.attrMappers[0]
  const target = attr.fromSource(source)

  t.deepEqual(target, expected)
})

// Tests -- relationships

test('should set relationship mappers', (t) => {
  const relationships = {
    'comments': {type: 'comment', path: 'some.path'},
    'author': {type: 'user', path: 'other.path', default: {from: 'theboss', to: 'oldboss'}}
  }
  const sourceDef = {id: 'entries', items: [{type: 'entry', relationships}]}

  const ret = create(sourceDef)

  const rels = ret.itemMappers.entry.relMappers
  t.is(rels.length, 2)
  const rel1 = rels[0]
  t.is(rel1.constructor.name, 'ValueMapper')
  t.is(rel1.key, 'comments')
  t.is(rel1.type, 'comment')
  t.is(rel1.path, 'some.path')
  t.is(rel1.default.from, null)
  t.is(rel1.default.to, null)
  const rel2 = rels[1]
  t.is(rel2.key, 'author')
  t.is(rel2.type, 'user')
  t.is(rel2.path, 'other.path')
  t.is(rel2.default.from, 'theboss')
  t.is(rel2.default.to, 'oldboss')
})

test('should set map pipeline of relationship mapper', (t) => {
  const map = [() => '1', 'two', null, 'unknown']
  const relationships = {'comments': {type: 'comment', path: 'some.path', map}}
  const sourceDef = {
    id: 'entry1',
    items: [{type: 'entry', relationships}]
  }
  const mappers = {two: () => '2'}

  const ret = create(sourceDef, {mappers})

  const map1 = ret.itemMappers.entry.relMappers[0].map
  t.is(map1.length, 2)
  t.is(typeof map1[0], 'function')
  t.is(map1[0](), '1')
  t.is(typeof map1[1], 'function')
  t.is(map1[1](), '2')
})

test('should set relationship mapper with no def', (t) => {
  const relationships = {'none': null}
  const sourceDef = {
    id: 'entry1',
    items: [{type: 'entry', relationships}]
  }

  const ret = create(sourceDef)

  t.is(ret.itemMappers.entry.relMappers.length, 1)
  const attr = ret.itemMappers.entry.relMappers[0]
  t.is(attr.type, 'none')
  t.is(attr.path, 'none')   // Coming from ValueMapper
})

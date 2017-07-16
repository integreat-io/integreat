import test from 'ava'

import prepare from './prepareSource'

test('should exist', (t) => {
  t.is(typeof prepare, 'function')
})

test('should return object with default values', (t) => {
  const ret = prepare()

  t.is(typeof ret, 'object')
  t.is(ret.adapter, null)
  t.is(ret.baseUri, null)
  t.deepEqual(ret.endpoints, {})
})

test('should set adapter', (t) => {
  const adapter = {}
  const adapters = {json: adapter}
  const sourceDef = {
    adapter: 'json'
  }

  const ret = prepare(sourceDef, {adapters})

  t.is(ret.adapter, adapter)
})

test('should set baseUri', (t) => {
  const sourceDef = {
    baseUri: 'http://api1.test/'
  }

  const ret = prepare(sourceDef)

  t.is(ret.baseUri, 'http://api1.test/')
})

test('should set endpoints', (t) => {
  const sourceDef = {
    endpoints: {
      one: 'http://api1.test/one',
      all: 'http://api1.test/all'
    }
  }

  const ret = prepare(sourceDef)

  t.truthy(ret.endpoints.one)
  t.is(ret.endpoints.one.uri, 'http://api1.test/one')
  t.truthy(ret.endpoints.all)
  t.is(ret.endpoints.all.uri, 'http://api1.test/all')
})

test('should set endpoint with path', (t) => {
  const sourceDef = {
    endpoints: {
      one: {uri: 'http://api1.test/one', path: 'rows'}
    }
  }

  const ret = prepare(sourceDef)

  t.truthy(ret.endpoints.one)
  t.is(ret.endpoints.one.uri, 'http://api1.test/one')
  t.is(ret.endpoints.one.path, 'rows')
})

test('should set auth strategy', (t) => {
  const auth = {}
  const auths = {twitter: auth}
  const sourceDef = {
    auth: 'twitter'
  }

  const ret = prepare(sourceDef, {auths})

  t.is(ret.auth, auth)
})

test('should create items array', (t) => {
  const sourceDef = {
    items: {entry: {path: 'the.path'}}
  }

  const ret = prepare(sourceDef)

  t.truthy(ret.items)
  const item = ret.items.entry
  t.truthy(item)
  t.is(item.type, 'entry')
  t.is(item.path, 'the.path')
})

test('should type items from type defs', (t) => {
  const attributes = [{key: 'id'}, {key: 'unknown'}, {key: 'age'}]
  const items = {entry: {attributes}}
  const sourceDef = {items}
  const types = {
    entry: {
      id: 'entry',
      attributes: {
        id: {type: 'string'},
        age: {type: 'integer'}
      }
    }
  }

  const ret = prepare(sourceDef, {types})

  const {attributes: attrs} = ret.items.entry
  t.true(Array.isArray(attrs))
  t.is(attrs.length, 2)
  t.is(attrs[0].key, 'id')
  t.is(attrs[0].type, 'string')
  t.is(attrs[1].key, 'age')
  t.is(attrs[1].type, 'integer')
})

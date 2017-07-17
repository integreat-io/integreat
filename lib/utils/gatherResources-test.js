import test from 'ava'

import gatherResources from './gatherResources'

const adapters = [
  'json',
  'couchdb'
]
const dir = '../adapters'

test('should exist', (t) => {
  t.is(typeof gatherResources, 'function')
})

test('should return object with adapters', (t) => {
  const ret = gatherResources(adapters, dir)()

  t.truthy(ret)
  t.truthy(ret.json)
  t.is(typeof ret.json.retrieve, 'function')
  t.truthy(ret.couchdb)
})

test('should return only json adapter', (t) => {
  const ret = gatherResources(adapters, dir)('json')

  t.truthy(ret.json)
  t.is(ret.couchdb, undefined)
})

test('should return json and coucdb adapters', (t) => {
  const ret = gatherResources(adapters, dir)('json', 'couchdb')

  t.truthy(ret.json)
  t.truthy(ret.couchdb)
})

test('should not return unknown adapter', (t) => {
  const ret = gatherResources(adapters, dir)('unknown')

  t.is(Object.keys(ret).length, 0)
})

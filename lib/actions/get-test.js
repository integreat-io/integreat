import test from 'ava'
import nock from 'nock'
import Source from '../source'
import Item from '../source/item'
import Attribute from '../source/attribute'
import couchdb from '../adapters/couchdb'

import get from './get'

// Helpers

function createSource (endpoint) {
  const source = new Source('entries', couchdb)
  source.endpoints.one = endpoint

  const itemDef = new Item('entry', null)
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.push(itemDef)

  return source
}

// Tests

test('should exist', (t) => {
  t.is(typeof get, 'function')
})

test('should get item from source', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const action = {
    type: 'GET',
    payload: {id: 'ent1', type: 'entry', source: 'entries'}
  }
  const source = createSource('http://api1.test/database/{type}:{id}')

  const ret = await get(action, source)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
})

test('should throw when item is not found', async (t) => {
  t.plan(1)
  nock('http://api2.test')
    .get('/database/entry:unknown')
    .reply(404)
  const action = {
    type: 'GET',
    payload: {id: 'unknown', type: 'entry', source: 'entries'}
  }
  const source = createSource('http://api2.test/database/{type}:{id}')

  try {
    await get(action, source)
  } catch (err) {
    t.pass()
  }
})

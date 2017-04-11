import test from 'ava'
import nock from 'nock'
import Sources from '../sources'
import Source from '../source'
import Item from '../source/item'
import Attribute from '../source/attribute'
import couchdb from '../adapters/couchdb'

import getAll from './getAll'

// Helpers

function getSources (endpoint) {
  const source = new Source('entries', couchdb)
  source.endpoints.all = endpoint

  const itemDef = new Item('entry', null)
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.push(itemDef)

  const sources = new Sources()
  sources.set('entries', source)
  return sources
}

// Tests

test('should exist', (t) => {
  t.is(typeof getAll, 'function')
})

test('should get all items from source', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{_id: 'ent1', type: 'entry'}])
  const action = {
    type: 'GET',
    payload: {type: 'entry', source: 'entries'}
  }
  const sources = getSources('http://api1.test/database')

  const ret = await getAll(action, sources)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
})

test('should get all items from source by type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{_id: 'ent1', type: 'entry'}])
  const action = {
    type: 'GET',
    payload: {type: 'entry'}
  }
  const sources = getSources('http://api1.test/database')
  sources.types.set('entry', 'entries')

  const ret = await getAll(action, sources)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
})

test('should return null on not found', async (t) => {
  nock('http://api3.test')
    .get('/unknown')
    .reply(404)
  const action = {
    type: 'GET',
    payload: {source: 'entries'}
  }
  const sources = getSources('http://api3.test/unknown')

  const ret = await getAll(action, sources)

  t.is(ret, null)
})

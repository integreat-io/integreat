import test from 'ava'
import nock from 'nock'
import Source from '../source'
import Item from '../source/item'
import Attribute from '../source/attribute'
import couchdb from '../adapters/couchdb'

import getAll from './getAll'

// Helpers

function createSource (endpoint) {
  const source = new Source('entries', couchdb)
  source.endpoints.all = endpoint

  const itemDef = new Item('entry', null)
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.push(itemDef)

  return source
}

// Tests

test.after((t) => {
  nock.restore()
})

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
  const source = createSource('http://api1.test/database')

  const ret = await getAll(action, source)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
})

test('should return null on not found', async (t) => {
  t.plan(1)
  nock('http://api3.test')
    .get('/unknown')
    .reply(404)
  const action = {
    type: 'GET',
    payload: {source: 'entries'}
  }
  const source = createSource('http://api3.test/unknown')

  try {
    await getAll(action, source)
  } catch (err) {
    t.pass()
  }
})

import test from 'ava'
import nock from 'nock'
import Source from '../../source'
import ItemMapper from '../../itemMapper'
import ValueMapper from '../../valueMapper'
import couchdb from '../../adapters/couchdb'

import get from './get'

// Helpers

function createSource (endpoint) {
  const source = new Source('entries', couchdb)
  source.endpoints.one = endpoint

  const itemDef = new ItemMapper('entry', null)
  itemDef.attrMappers.push(new ValueMapper('id'))
  source.itemMappers.entry = itemDef

  return source
}

// Tests

test.after((t) => {
  nock.restore()
})

test('should exist', (t) => {
  t.is(typeof get, 'function')
})

test('should get item from source', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const action = {
    type: 'GET',
    source: 'entries',
    payload: {id: 'ent1', type: 'entry'}
  }
  const source = createSource('http://api1.test/database/{type}:{id}')
  const sources = {entries: source}

  const ret = await get(action, sources)

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
    source: 'entries',
    payload: {id: 'unknown', type: 'entry'}
  }
  const source = createSource('http://api2.test/database/{type}:{id}')
  const sources = {entries: source}

  try {
    await get(action, sources)
  } catch (err) {
    t.pass()
  }
})

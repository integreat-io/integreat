import test from 'ava'
import nock from 'nock'
import Source from '../../source'
import ItemMapper from '../../itemMapper'
import ValueMapper from '../../valueMapper'
import couchdb from '../../adapters/couchdb'

import getAll from './getAll'

// Helpers

function createSource (endpoint) {
  const source = new Source('entries', couchdb)
  source.endpoints.all = endpoint

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
  t.is(typeof getAll, 'function')
})

test('should get all items from source', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{_id: 'ent1', type: 'entry'}])
  const action = {
    type: 'GET',
    source: 'entries',
    payload: {type: 'entry'}
  }
  const source = createSource('http://api1.test/database')
  const sources = {entries: source}

  const ret = await getAll(action, sources)

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
    source: 'entries'
  }
  const source = createSource('http://api3.test/unknown')
  const sources = {entries: source}

  try {
    await getAll(action, sources)
  } catch (err) {
    t.pass()
  }
})

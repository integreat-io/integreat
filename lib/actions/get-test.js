import test from 'ava'
import nock from 'nock'
import Source from '../source'
import Item from '../source/item'
import Attribute from '../source/attribute'
import couchdb from '../adapters/couchdb'

import get from './get'

// Helpers

function getSourceGetter (endpoint) {
  const source = new Source('entries', couchdb)
  source.endpoints.one = endpoint
  const itemDef = new Item('entry', null)
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.push(itemDef)
  return (src) => (src === 'entries') ? source : null
}

// Tests

test('should exist', (t) => {
  t.is(typeof get, 'function')
})

test('should get item from store', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const action = {
    type: 'GET',
    payload: {id: 'ent1', type: 'entry', source: 'entries'}
  }
  const getSource = getSourceGetter('http://api1.test/database/{type}:{id}')

  const ret = await get(action, getSource)

  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
})

test('should return null when item is not found', async (t) => {
  nock('http://api2.test')
    .get('/database/entry:unknown')
    .reply(404)
  const action = {
    type: 'GET',
    payload: {id: 'unknown', type: 'entry', source: 'entries'}
  }
  const getSource = getSourceGetter('http://api2.test/database/{type}:{id}')

  const ret = await get(action, getSource)

  t.is(ret, null)
})

test('should return null when no id is given', async (t) => {
  nock('http://api3.test:')
    .get('/database/entry:')
    .reply(200, {_id: 'ent1', type: 'entry'})
    // Will give a respons if trying to fetch without id
  const action = {
    type: 'GET',
    payload: {type: 'entry', source: 'entries'}
  }
  const getSource = getSourceGetter('http://api3.test/database/{type}:{id}')

  const ret = await get(action, getSource)

  t.is(ret, null)
})

test('should return null when no type is given', async (t) => {
  nock('http://api4.test:')
    .get('/database/:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
    // Will give a respons if trying to fetch without id
  const action = {
    type: 'GET',
    payload: {id: 'ent1', source: 'entries'}
  }
  const getSource = getSourceGetter('http://api4.test/database/{type}:{id}')

  const ret = await get(action, getSource)

  t.is(ret, null)
})

test('should return null on other error', async (t) => {
  nock('http://api5.test:')
    .get('/database/entry:ent1')
    .reply(500)
    // Will give a respons if trying to fetch without id
  const action = {
    type: 'GET',
    payload: {id: 'ent1', type: 'entry', source: 'entries'}
  }
  const getSource = getSourceGetter('http://api5.test/database/{type}:{id}')

  const ret = await get(action, getSource)

  t.is(ret, null)
})

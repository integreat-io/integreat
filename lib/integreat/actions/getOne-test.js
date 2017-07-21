import test from 'ava'
import nock from 'nock'
import source from '../source'
import couchdb from '../../adapters/couchdb'
import datatype from '../datatype'

import getOne from './getOne'

// Helpers

function createSource (endpoint, {datatypes = {}} = {}) {
  const endpoints = {getone: {uri: endpoint}}
  const attributes = {id: {}}
  const mappings = {entry: {type: 'entry', attributes}}
  return source({id: 'entries', adapter: couchdb, endpoints, mappings}, {datatypes})
}

// Tests

test.after((t) => {
  nock.restore()
})

test('should exist', (t) => {
  t.is(typeof getOne, 'function')
})

test('should get item from source', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const payload = {
    id: 'ent1',
    type: 'entry',
    source: 'entries'
  }
  const src = createSource('http://api1.test/database/{type}:{id}')
  const getSource = (type, source) => (source === 'entries') ? src : null

  const ret = await getOne(payload, {getSource})

  t.is(ret.status, 'ok')
  t.truthy(ret.data)
  t.is(ret.data.id, 'ent1')
  t.is(ret.data.type, 'entry')
})

test('should get first item when several is returned', async (t) => {
  nock('http://api3.test')
    .get('/database/entry:ent1')
    .reply(200, [{_id: 'ent1', type: 'entry'}, {_id: 'ent2', type: 'entry'}])
  const payload = {
    id: 'ent1',
    type: 'entry'
  }
  const src = createSource('http://api3.test/database/{type}:{id}')
  const getSource = () => src

  const ret = await getOne(payload, {getSource})

  t.truthy(ret.data)
  t.is(ret.data.id, 'ent1')
})

test('should get default values from type', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const payload = {
    id: 'ent1',
    type: 'entry',
    source: 'entries'
  }
  const datatypes = {entry: datatype({
    id: 'entry',
    attributes: {byline: {default: 'Somebody'}}
  })}
  const src = createSource('http://api1.test/database/{type}:{id}', {datatypes})
  const getSource = () => src

  const ret = await getOne(payload, {getSource})

  t.truthy(ret.data.attributes)
  t.is(ret.data.attributes.byline, 'Somebody')
})

test('should not get default values from type', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const payload = {
    id: 'ent1',
    type: 'entry',
    source: 'entries',
    mappedValuesOnly: true
  }
  const datatypes = {entry: datatype({
    id: 'entry',
    attributes: {byline: {default: 'Somebody'}}
  })}
  const src = createSource('http://api1.test/database/{type}:{id}', {datatypes})
  const getSource = () => src

  const ret = await getOne(payload, {getSource})

  t.truthy(ret.data.attributes)
  t.is(ret.data.attributes.byline, undefined)
})

test('should infer source from type', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const payload = {id: 'ent1', type: 'entry'}
  const src = createSource('http://api1.test/database/{type}:{id}')
  const getSource = (type, source) => (type === 'entry') ? src : null

  const ret = await getOne(payload, {getSource})

  t.is(ret.status, 'ok')
  t.truthy(ret.data)
  t.is(ret.data.id, 'ent1')
})

test('should return error when item is not found', async (t) => {
  nock('http://api2.test')
    .get('/database/entry:unknown')
    .reply(404)
  const payload = {
    id: 'unknown',
    type: 'entry',
    source: 'entries'
  }
  const src = createSource('http://api2.test/database/{type}:{id}')
  const getSource = () => src

  const ret = await getOne(payload, {getSource})

  t.is(ret.status, 'notfound')
})

test('should return error when no getSource', async (t) => {
  const payload = {
    id: 'ent1',
    type: 'entry',
    source: 'entries'
  }

  const ret = await getOne(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const src = createSource('http://api3.test/database/{type}:{id}')
  const getSource = () => src

  const ret = await getOne(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
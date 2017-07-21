import test from 'ava'
import nock from 'nock'
import source from '../source'
import couchdb from '../../adapters/couchdb'
import datatype from '../datatype'

import setOne from './setOne'

// Helpers

const createSource = (endpoint) => {
  const attributes = {id: {}, type: {}}
  const mappings = {entry: {type: 'entry', attributes}}
  const datatypes = {entry: datatype({id: 'entry', attributes: {type: {}}})}
  const endpoints = {setone: {uri: endpoint}, other: {uri: 'http://api1.test/other/{type}:{id}'}}
  return source({id: 'entries', adapter: couchdb, mappings, endpoints}, {datatypes})
}

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof setOne, 'function')
})

test('should set item to source', async (t) => {
  const scope = nock('http://api1.test')
    .put('/database/entry:ent1', {_id: 'ent1', type: 'entry'})
    .reply(200, {okay: true, id: 'ent1', rev: '000001'})
  const payload = {
    source: 'entries',
    data: {id: 'ent1', type: 'entry'}
  }
  const src = createSource('http://api1.test/database/{type}:{id}')
  const getSource = (type, source) => (source === 'entries') ? src : null

  const ret = await setOne(payload, {getSource})

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 'ok')
})

test('should infer source id from type', async (t) => {
  const scope = nock('http://api2.test')
    .put('/database/entry:ent1', {_id: 'ent1', type: 'entry'})
    .reply(200, {okay: true, id: 'ent1', rev: '000001'})
  const payload = {data: {id: 'ent1', type: 'entry'}}
  const src = createSource('http://api2.test/database/{type}:{id}')
  const getSource = (type, source) => (type === 'entry') ? src : null

  const ret = await setOne(payload, {getSource})

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 'ok')
})

test('should set to other endpoint', async (t) => {
  const scope = nock('http://api1.test')
    .put('/other/entry:ent1', {_id: 'ent1', type: 'entry'})
    .reply(200, {okay: true, id: 'ent1', rev: '000001'})
  const payload = {
    source: 'entries',
    endpoint: 'other',
    data: {id: 'ent1', type: 'entry'}
  }
  const src = createSource('http://api1.test/database/{type}:{id}')
  const getSource = () => src

  const ret = await setOne(payload, {getSource})

  t.true(scope.isDone())
  t.is(ret.status, 'ok')
})

test('should set with uri params', async (t) => {
  const scope = nock('http://api1.test')
    .put('/entries/entry:ent1', {_id: 'ent1', type: 'entry'})
    .reply(200, {okay: true, id: 'ent1', rev: '000001'})
  const payload = {
    source: 'entries',
    params: {typefolder: 'entries'},
    data: {id: 'ent1', type: 'entry'}
  }
  const src = createSource('http://api1.test/{typefolder}/{type}:{id}')
  const getSource = () => src

  const ret = await setOne(payload, {getSource})

  t.true(scope.isDone())
  t.is(ret.status, 'ok')
})

test('should return error if no getSource', async (t) => {
  const payload = {
    source: 'entries',
    data: {id: 'ent1', type: 'entry'}
  }

  const ret = await setOne(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const src = createSource('http://api1.test/database/{type}:{id}')
  const getSource = () => src

  const ret = await setOne(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

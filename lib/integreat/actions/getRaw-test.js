import test from 'ava'
import nock from 'nock'
import source from '../source'
import json from '../../adapters/json'

import getRaw from './getRaw'

// Helpers

function createSource ({datatypes = {}} = {}) {
  return source({id: 'entries', adapter: json}, {datatypes})
}

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof getRaw, 'function')
})

test('should get raw data from source', async (t) => {
  nock('http://api1.test')
    .get('/entries')
    .reply(200, {key: 'ent1', title: 'Some title'})
  const payload = {
    uri: 'http://api1.test/entries',
    source: 'entries'
  }
  const src = createSource()
  const getSource = (type, source) => (source === 'entries') ? src : null

  const ret = await getRaw(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, {key: 'ent1', title: 'Some title'})
})

test('should return error on not found', async (t) => {
  nock('http://api2.test')
    .get('/unknown')
    .reply(404)
  const payload = {
    uri: 'http://api2.test/unknown',
    source: 'entries'
  }
  const src = createSource()
  const getSource = () => src

  const ret = await getRaw(payload, {getSource})

  t.is(ret.status, 'notfound')
})

test('should return error when no getSource', async (t) => {
  const payload = {
    uri: 'http://api1.test/entries',
    source: 'entries'
  }

  const ret = await getRaw(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const src = createSource()
  const getSource = () => src

  const ret = await getRaw(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

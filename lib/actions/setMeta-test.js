import test from 'ava'
import nock from 'nock'
import source from '../source'
import json from '../adapters/json'
import datatype from '../datatype'
import setupMapping from '../mapping'
import createEndpoint from '../../tests/helpers/createEndpoint'

import setMeta from './setMeta'

// Helpers

const datatypes = {meta: datatype({
  id: 'meta',
  source: 'store',
  attributes: {lastSyncedAt: 'date', status: 'string'}
})}

const mappings = [
  setupMapping(
    {type: 'meta', source: 'store'},
    {datatypes})
]

const createSource = (id, {meta, endpoints = []} = {}) => source({
  id,
  adapter: json,
  meta,
  endpoints
}, {
  datatypes,
  mappings
})

const lastSyncedAt = new Date()

const regexISODate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof setMeta, 'function')
})

test('should set metadata on source', async (t) => {
  const scope = nock('http://api1.test')
    .put('/database/meta%3Astore', {
      id: 'meta:store',
      type: 'meta',
      attributes: {
        createdAt: regexISODate,
        updatedAt: regexISODate,
        lastSyncedAt: lastSyncedAt.toISOString(),
        status: 'busy'
      },
      relationships: {}
    })
    .reply(200, {okay: true, id: 'meta:store', rev: '000001'})
  const endpoints = [createEndpoint({uri: 'http://api1.test/database/{id}'})]
  const src = createSource('store', {meta: 'meta', endpoints})
  const getSource = (type, source) => (source === 'store' || type === 'meta') ? src : null
  const payload = {
    source: 'store',
    meta: {lastSyncedAt, status: 'busy'}
  }

  const ret = await setMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should not set metadata on source when no meta type', async (t) => {
  const scope = nock('http://api2.test')
    .put('/database/meta%3Astore')
    .reply(200, {okay: true, id: 'meta:store', rev: '000001'})
  const endpoints = [createEndpoint({uri: 'http://api2.test/database/{id}'})]
  const src = createSource('store', {meta: null, endpoints})
  const getSource = (type, source) => (source === 'store' || type === 'meta') ? src : null
  const payload = {
    source: 'store',
    meta: {lastSyncedAt}
  }

  const ret = await setMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'noaction')
  t.false(scope.isDone())
})

test('should set metadata on other source', async (t) => {
  const scope = nock('http://api3.test')
    .put('/database/meta%3Aentries', {
      id: 'meta:entries',
      type: 'meta',
      attributes: {
        createdAt: regexISODate,
        updatedAt: regexISODate,
        lastSyncedAt: lastSyncedAt.toISOString()
      },
      relationships: {}
    })
    .reply(200, {okay: true, id: 'meta:entries', rev: '000001'})
  const endpoints = [createEndpoint({id: 'setMeta', uri: 'http://api3.test/database/{id}'})]
  const storeSrc = createSource('store', {endpoints})
  const src = createSource('entries', {meta: 'meta'})
  const getSource = (type, source) => (source === 'entries')
    ? src : (source === 'store' || type === 'meta') ? storeSrc : null
  const payload = {
    source: 'entries',
    meta: {lastSyncedAt},
    endpoint: 'setMeta'
  }

  const ret = await setMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return status noaction when meta is set to an unknown datatype', async (t) => {
  const src = createSource('store', {meta: 'unknown'})
  const getSource = (type, source) => (source === 'store') ? src : null
  const payload = {
    source: 'store',
    meta: {lastSyncedAt}
  }

  const ret = await setMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should return error for unknown source', async (t) => {
  const getSource = (type, source) => null
  const payload = {
    source: 'unknown',
    meta: {lastSyncedAt}
  }

  const ret = await setMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error when no payload', async (t) => {
  const payload = null
  const src = createSource('store')
  const getSource = () => src

  const ret = await setMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

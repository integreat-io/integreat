import test from 'ava'
import nock from 'nock'
import sinon from 'sinon'
import datatype from '../datatype'
import source from '../source'
import json from '../../adapters/json'

import getUnmapped from './getUnmapped'

// Helpers

const datatypes = {entry: datatype({id: 'entry', attributes: {headline: 'string'}})}

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof getUnmapped, 'function')
})

test('should get all items from source', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{key: 'ent1', headline: 'Entry 1'}])
  const endpoints = {get: {uri: 'http://api1.test/database'}}
  const mappings = {entry: {type: 'entry', attributes: {id: 'key', title: 'headline'}}}
  const src = source({id: 'entries', adapter: json, endpoints, mappings}, {datatypes})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {source: 'entries'}

  const ret = await getUnmapped(payload, {getSource})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.deepEqual(ret.data[0], {key: 'ent1', headline: 'Entry 1'})
})

test('should get from endpoint with uri params', async (t) => {
  nock('http://api2.test')
    .get('/database/entry:ent1')
    .reply(200, {key: 'ent1', headline: 'Entry 1'})
  const endpoints = {getOne: {uri: 'http://api2.test/database/{type}:{id}'}}
  const src = source({id: 'entries', adapter: json, endpoints}, {datatypes})
  const payload = {
    id: 'ent1',
    type: 'entry',
    source: 'entries',
    endpoint: 'getOne'
  }

  const ret = await getUnmapped(payload, {getSource: () => src})

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, {key: 'ent1', headline: 'Entry 1'})
})

test('should infer source id from type', async (t) => {
  nock('http://api4.test')
    .get('/database')
    .reply(200, [{key: 'ent1', headline: 'Entry 1'}])
  const endpoints = {get: {uri: 'http://api4.test/database'}}
  const mappings = {entry: {type: 'entry', attributes: {id: 'key', title: 'headline'}}}
  const src = source({id: 'entries', adapter: json, endpoints, mappings}, {datatypes})
  const getSource = (type, source) => (type === 'entry') ? src : null
  const payload = {type: 'entry'}

  const ret = await getUnmapped(payload, {getSource})

  t.is(ret.status, 'ok')
})

test('should return error on not found', async (t) => {
  nock('http://api3.test')
    .get('/unknown')
    .reply(404)
  const endpoints = {get: {uri: 'http://api3.test/unknown'}}
  const src = source({id: 'entries', adapter: json, endpoints}, {datatypes})
  const getSource = () => src
  const payload = {source: 'entries'}

  const ret = await getUnmapped(payload, {getSource})

  t.is(ret.status, 'notfound')
  t.is(ret.data, undefined)
  t.is(typeof ret.error, 'string')
})

test('should return error when no getSource', async (t) => {
  const payload = {source: 'entries'}

  const ret = await getUnmapped(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const endpoints = {get: {uri: 'http://api4.test/unknown'}}
  const src = source({id: 'entries', adapter: json, endpoints}, {datatypes})
  const getSource = () => src

  const ret = await getUnmapped(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should call retrieveNormalized with params object', async (t) => {
  const endpoints = {get: {uri: 'http://api1.test/database'}}
  const mappings = {entry: {type: 'entry', attributes: {id: 'key', title: 'headline'}}}
  const src = source({id: 'entries', adapter: json, endpoints, mappings}, {datatypes})
  const getSource = (type, source) => (source === 'entries') ? src : null
  sinon.stub(src, 'retrieveNormalized').resolves({status: 'ok', data: {}})
  const payload = {
    id: 'ent1',
    type: 'entry',
    source: 'entries',
    params: {view: 'entries_expired'}
  }

  await getUnmapped(payload, {getSource})

  t.is(src.retrieveNormalized.callCount, 1)
  const {params} = src.retrieveNormalized.args[0][0]
  t.truthy(params)
  t.is(params.id, 'ent1')
  t.is(params.type, 'entry')
  t.is(params.source, 'entries')
  t.is(params.view, 'entries_expired')
})

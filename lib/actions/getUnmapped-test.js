import test from 'ava'
import nock from 'nock'
import sinon from 'sinon'
import schema from '../schema'
import service from '../service'
import json from '../adapters/json'
import createEndpoint from '../../tests/helpers/createEndpoint'

import getUnmapped from './getUnmapped'

// Helpers

const schemas = {entry: schema({id: 'entry', attributes: {headline: 'string'}})}

const ident = {root: true}

test.after((t) => {
  nock.restore()
})

// Tests

test('should get all items from service', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{key: 'ent1', headline: 'Entry 1'}])
  const endpoints = [createEndpoint({id: 'get', uri: 'http://api1.test/database'})]
  const src = service({id: 'entries', adapter: json, endpoints}, {schemas})
  const getService = (type, service) => (service === 'entries') ? src : null
  const payload = {service: 'entries'}
  const expected = {
    status: 'ok',
    data: [{key: 'ent1', headline: 'Entry 1'}],
    access: {status: 'granted', scheme: 'unmapped', ident}
  }

  const ret = await getUnmapped({payload, ident}, {getService})

  t.deepEqual(ret, expected)
})

test('should get from endpoint with uri params', async (t) => {
  nock('http://api2.test')
    .get('/database/entry:ent1')
    .reply(200, {key: 'ent1', headline: 'Entry 1'})
  const endpoints = [createEndpoint({id: 'getOne', uri: 'http://api2.test/database/{type}:{id}'})]
  const src = service({id: 'entries', adapter: json, endpoints}, {schemas})
  const payload = {
    id: 'ent1',
    type: 'entry',
    service: 'entries',
    endpoint: 'getOne'
  }

  const ret = await getUnmapped({payload, ident}, {getService: () => src})

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, {key: 'ent1', headline: 'Entry 1'})
})

test('should infer service id from type', async (t) => {
  nock('http://api4.test')
    .get('/database')
    .reply(200, [{key: 'ent1', headline: 'Entry 1'}])
  const endpoints = [createEndpoint({id: 'get', uri: 'http://api4.test/database'})]
  const src = service({id: 'entries', adapter: json, endpoints}, {schemas})
  const getService = (type, service) => (type === 'entry') ? src : null
  const payload = {type: 'entry'}

  const ret = await getUnmapped({payload, ident}, {getService})

  t.is(ret.status, 'ok')
})

test('should return error on not found', async (t) => {
  nock('http://api3.test')
    .get('/unknown')
    .reply(404)
  const endpoints = [createEndpoint({id: 'get', uri: 'http://api3.test/unknown'})]
  const src = service({id: 'entries', adapter: json, endpoints}, {schemas})
  const getService = () => src
  const payload = {service: 'entries'}

  const ret = await getUnmapped({payload, ident}, {getService})

  t.is(ret.status, 'notfound')
  t.is(ret.data, undefined)
  t.is(typeof ret.error, 'string')
})

test('should return error when no getService', async (t) => {
  const payload = {service: 'entries'}

  const ret = await getUnmapped({payload})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const endpoints = [createEndpoint({id: 'get', uri: 'http://api4.test/unknown'})]
  const src = service({id: 'entries', adapter: json, endpoints}, {schemas})
  const getService = () => src

  const ret = await getUnmapped({payload, ident}, {getService})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should call send with params object', async (t) => {
  const endpoints = [createEndpoint({id: 'get', uri: 'http://api1.test/database'})]
  const src = service({id: 'entries', adapter: json, endpoints}, {schemas})
  const getService = (type, service) => (service === 'entries') ? src : null
  sinon.stub(src, 'send').resolves({status: 'ok', data: {}})
  const params = {view: 'entries_expired'}
  const payload = {
    id: 'ent1',
    type: 'entry',
    service: 'entries',
    params
  }

  await getUnmapped({payload, ident}, {getService})

  t.is(src.send.callCount, 1)
  const request = src.send.args[0][0]
  t.truthy(request.params)
  t.is(request.params.view, 'entries_expired')
})

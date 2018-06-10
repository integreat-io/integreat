import test from 'ava'
import createEndpoint from '../../tests/helpers/createEndpoint'

import prepareRequest from './prepareRequest'

test('should prepare request', (t) => {
  const request = {
    action: 'SET',
    data: {name: 'John F.'},
    headers: {},
    auth: null,
    params: {
      id: 'johnf',
      type: 'user'
    },
    access: {ident: {id: 'johnf'}}
  }
  const expected = {
    action: 'SET',
    data: {name: 'John F.'},
    endpoint: undefined,
    headers: {},
    auth: null,
    params: {
      id: 'johnf',
      type: 'user',
      typePlural: 'users',
      ident: 'johnf'
    },
    access: {ident: {id: 'johnf'}}
  }

  const ret = prepareRequest(request)

  t.deepEqual(ret, expected)
})

test('should make sure request have headers object', (t) => {
  const request = {action: 'SET'}

  const ret = prepareRequest(request)

  t.deepEqual(ret.headers, {})
})

test('should set auth', (t) => {
  const auth = {}
  const request = {action: 'SET'}

  const ret = prepareRequest(request, {auth})

  t.is(ret.auth, auth)
})

test('should get endpoint and add to the request', (t) => {
  const request = {action: 'GET', params: {id: 'ent1', type: 'entry'}}
  const endpoints = [createEndpoint({uri: ['http://some.api/1.0']})]
  const expectedUri = ['http://some.api/1.0']

  const ret = prepareRequest(request, {endpoints})

  t.truthy(ret.endpoint)
  t.deepEqual(ret.endpoint.uri, expectedUri)
})

test('should add endpoint with id', (t) => {
  const request = {action: 'GET', params: {id: 'ent1', type: 'entry'}, endpoint: 'one'}
  const endpoints = [
    createEndpoint({uri: ['http://wrong.api/1.0'], action: 'GET'}),
    createEndpoint({uri: ['http://right.api/1.0'], id: 'one'})
  ]

  const ret = prepareRequest(request, {endpoints})

  t.is(typeof ret.endpoint, 'object')
  t.deepEqual(ret.endpoint.uri, ['http://right.api/1.0'])
})

test('should use provided endpoint', (t) => {
  const endpoint = {uri: 'http://some.api/1.0'}
  const request = {action: 'GET', params: {id: 'ent1', type: 'entry'}, endpoint}
  const prepareEndpoint = (endpoint) => ({...endpoint, uri: [endpoint.uri]})
  const endpoints = [createEndpoint({uri: ['http://other.api/1.0']})]
  const expected = {uri: ['http://some.api/1.0']}

  const ret = prepareRequest(request, {endpoints, prepareEndpoint})

  t.deepEqual(ret.endpoint, expected)
})

test('should set endpoint to undefined on no match', (t) => {
  const request = {action: 'GET', params: {id: 'ent1', type: 'entry'}}
  const endpoints = []

  const ret = prepareRequest(request, {endpoints})

  t.is(ret.endpoint, undefined)
})

test('should set typePlural from plurals dictionary', (t) => {
  const request = {action: 'GET', params: {id: 'ent1', type: 'entry'}}
  const schemas = {entry: {plural: 'entries'}}

  const ret = prepareRequest(request, {schemas})

  t.is(ret.params.typePlural, 'entries')
})

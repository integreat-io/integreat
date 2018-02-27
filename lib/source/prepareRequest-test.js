import test from 'ava'
import createEndpoint from '../../tests/helpers/createEndpoint'
import createDatatype from '../datatype'

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
    access: {
      status: 'granted',
      scheme: 'data',
      ident: {id: 'johnf'}
    }
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
  const datatypes = {entry: {plural: 'entries'}}

  const ret = prepareRequest(request, {datatypes})

  t.is(ret.params.typePlural, 'entries')
})

test('should cast data', (t) => {
  const datatypes = {
    entry: createDatatype({
      id: 'entry',
      attributes: {one: 'integer'}
    })
  }
  const request = {
    action: 'SET',
    data: {id: 'ent1', type: 'entry', attributes: {one: '1'}},
    headers: {},
    auth: null,
    params: {
      id: 'johnf',
      type: 'user'
    },
    access: {ident: {id: 'johnf'}}
  }
  const expectedData = {
    id: 'ent1',
    type: 'entry',
    attributes: {one: 1},
    relationships: {}
  }

  const ret = prepareRequest(request, {datatypes})

  t.deepEqual(ret.data, expectedData)
})

test('should authorize request', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'auth'}}
  const auth = {}
  const request = {
    action: 'GET',
    params: {
      id: 'ent1',
      type: 'entry'
    },
    access: {ident: {id: 'johnf'}}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'auth',
    ident: {id: 'johnf'}
  }

  const ret = prepareRequest(request, {auth, datatypes})

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'auth'}}
  const auth = {}
  const request = {
    action: 'GET',
    params: {
      id: 'ent1',
      type: 'entry'
    }
  }
  const expectedAccess = {
    status: 'refused',
    scheme: 'auth',
    ident: null
  }

  const ret = prepareRequest(request, {auth, datatypes})

  t.deepEqual(ret.access, expectedAccess)
})

test('should remove unauthorized data items', (t) => {
  const datatypes = {user: createDatatype({id: 'user', access: {identFromField: 'id'}})}
  const auth = {}
  const request = {
    action: 'SET',
    data: [
      {id: 'johnf', type: 'user'},
      {id: 'betty', type: 'user'}
    ],
    access: {ident: {id: 'johnf'}}
  }
  const expectedAccess = {
    status: 'partially',
    scheme: 'data',
    ident: {id: 'johnf'}
  }
  const expectedData = [{id: 'johnf', type: 'user', attributes: {}, relationships: {}}]

  const ret = prepareRequest(request, {auth, datatypes})

  t.deepEqual(ret.access, expectedAccess)
  t.deepEqual(ret.data, expectedData)
})

import test from 'ava'

import prepareResponse from './prepareResponse'

test('should return status, data, and paging', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'all'}}
  const response = {
    status: 'ok',
    data: [{id: 'ent1', type: 'entry'}],
    paging: {next: {type: 'entry', pageAfter: 'ent1', pageSize: 20}}
  }

  const ret = prepareResponse(response, {}, {datatypes})

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, response.data)
  t.deepEqual(ret.paging, response.paging)
})

test('should return granted response without data', (t) => {
  const request = {action: 'GET', params: {type: 'entry'}}
  const response = {status: 'ok', data: null, access: {status: 'granted'}}

  const ret = prepareResponse(response, request)

  t.deepEqual(ret, response)
})

test('should authorize data', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'auth'}}
  const access = {status: 'granted', scheme: 'auth', ident: {id: 'johnf'}}
  const request = {action: 'GET', params: {type: 'entry'}, access}
  const data = [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}]
  const response = {status: 'ok', data, access}
  const expected = {
    status: 'ok',
    data,
    access: {status: 'granted', scheme: 'data', ident: {id: 'johnf'}}
  }

  const ret = prepareResponse(response, request, {datatypes})

  t.deepEqual(ret, expected)
})

test('should remove unauthorized data', (t) => {
  const datatypes = {user: {id: 'user', access: {identFromField: 'id'}}}
  const access = {status: 'granted', scheme: 'auth', ident: {id: 'johnf'}}
  const request = {action: 'GET', params: {type: 'user'}, access}
  const data = [{id: 'johnf', type: 'user'}, {id: 'betty', type: 'user'}]
  const response = {status: 'ok', data, access}
  const expected = {
    status: 'ok',
    data: [{id: 'johnf', type: 'user'}],
    access: {status: 'partially', scheme: 'data', ident: {id: 'johnf'}}
  }

  const ret = prepareResponse(response, request, {datatypes})

  t.deepEqual(ret, expected)
})

test('should change status to noaccess when no data is authorized', (t) => {
  const datatypes = {user: {id: 'user', access: {role: 'admin'}}}
  const access = {status: 'granted', scheme: 'auth', ident: {id: 'johnf'}}
  const request = {action: 'GET', params: {type: 'user'}, access}
  const data = [{id: 'johnf', type: 'user'}, {id: 'betty', type: 'user'}]
  const response = {status: 'ok', data, access}
  const expected = {
    status: 'noaccess',
    data: [],
    access: {status: 'refused', scheme: 'data', ident: {id: 'johnf'}}
  }

  const ret = prepareResponse(response, request, {datatypes})

  t.deepEqual(ret, expected)
})

test('should set access from request when response has none', (t) => {
  const access = {status: 'refused', scheme: 'auth', ident: null}
  const request = {action: 'GET', params: {type: 'entry'}, access}
  const response = {status: 'noaccess', data: null}
  const expected = {status: 'noaccess', data: null, access}

  const ret = prepareResponse(response, request)

  t.deepEqual(ret, expected)
})

test('should not authorize data when unmapped is true', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'auth'}}
  const access = {status: 'granted', scheme: 'auth', ident: {root: true}}
  const request = {action: 'GET_UNMAPPED', params: {type: 'entry'}, access}
  const data = [{key: 'ent1'}]
  const response = {status: 'ok', data, access}
  const expected = {
    status: 'ok',
    data: [{key: 'ent1'}],
    access: {status: 'granted', scheme: 'unmapped', ident: {root: true}}
  }

  const ret = prepareResponse(response, request, {datatypes, unmapped: true})

  t.deepEqual(ret, expected)
})

test('should not authorize when unmapped is true and not root', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'auth'}}
  const access = {status: 'granted', scheme: 'auth', ident: {id: 'johnf'}}
  const request = {action: 'GET_UNMAPPED', params: {type: 'entry'}, access}
  const data = [{key: 'ent1'}]
  const response = {status: 'ok', data, access}
  const expected = {
    status: 'noaccess',
    data: [],
    access: {status: 'refused', scheme: 'unmapped', ident: {id: 'johnf'}}
  }

  const ret = prepareResponse(response, request, {datatypes, unmapped: true})

  t.deepEqual(ret, expected)
})

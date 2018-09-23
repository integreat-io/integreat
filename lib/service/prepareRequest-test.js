import test from 'ava'

import prepareRequest from './prepareRequest'

test('should prepare request', (t) => {
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' }
    },
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    method: 'MUTATION',
    params: {
      id: 'johnf',
      type: 'user'
    },
    data: { name: 'John F.' },
    endpoint: null,
    access: { ident: { id: 'johnf' } },
    auth: null,
    meta: {
      typePlural: 'users'
    }
  }

  const ret = prepareRequest(action)

  t.deepEqual(ret, expected)
})

test('should set method for GET action', (t) => {
  const action = {
    type: 'GET',
    payload: {}
  }

  const ret = prepareRequest(action)

  t.is(ret.method, 'QUERY')
})

test('should set method for DELETE action', (t) => {
  const action = {
    type: 'DELETE',
    payload: {}
  }

  const ret = prepareRequest(action)

  t.is(ret.method, 'EXTINCTION')
})

test('should set method for action starting with GET_', (t) => {
  const action = {
    type: 'GET_IDENT',
    payload: {}
  }

  const ret = prepareRequest(action)

  t.is(ret.method, 'QUERY')
})

test('should set method for action starting with SET_', (t) => {
  const action = {
    type: 'SET_META',
    payload: {}
  }

  const ret = prepareRequest(action)

  t.is(ret.method, 'MUTATION')
})

test('should set method for action with unknown type', (t) => {
  const action = {
    type: 'SOMETHING_NEW',
    payload: {}
  }

  const ret = prepareRequest(action)

  t.is(ret.method, 'UNKNOWN')
})

test('should set auth', (t) => {
  const auth = {}
  const action = { type: 'SET', payload: {} }

  const ret = prepareRequest(action, { auth })

  t.is(ret.auth, auth)
})

test('should set typePlural from plurals dictionary', (t) => {
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }
  const schemas = { entry: { plural: 'entries' } }

  const ret = prepareRequest(action, { schemas })

  t.is(ret.meta.typePlural, 'entries')
})

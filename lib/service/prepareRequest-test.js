import test from 'ava'

import prepareRequest from './prepareRequest'

test('should prepare request', (t) => {
  const request = {
    action: 'SET',
    data: { name: 'John F.' },
    headers: {},
    auth: null,
    params: {
      id: 'johnf',
      type: 'user'
    },
    access: { ident: { id: 'johnf' } }
  }
  const expected = {
    action: 'SET',
    data: { name: 'John F.' },
    endpoint: undefined,
    headers: {},
    auth: null,
    params: {
      id: 'johnf',
      type: 'user',
      typePlural: 'users',
      ident: 'johnf'
    },
    access: { ident: { id: 'johnf' } }
  }

  const ret = prepareRequest(request)

  t.deepEqual(ret, expected)
})

test('should make sure request have headers object', (t) => {
  const request = { action: 'SET' }

  const ret = prepareRequest(request)

  t.deepEqual(ret.headers, {})
})

test('should set auth', (t) => {
  const auth = {}
  const request = { action: 'SET' }

  const ret = prepareRequest(request, { auth })

  t.is(ret.auth, auth)
})

test('should set typePlural from plurals dictionary', (t) => {
  const request = { action: 'GET', params: { id: 'ent1', type: 'entry' } }
  const schemas = { entry: { plural: 'entries' } }

  const ret = prepareRequest(request, { schemas })

  t.is(ret.params.typePlural, 'entries')
})

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

  const ret = prepareRequest(action)

  t.deepEqual(ret, expected)
})

test('should make sure request have headers object', (t) => {
  const action = { type: 'SET', payload: {} }

  const ret = prepareRequest(action)

  t.deepEqual(ret.headers, {})
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

  t.is(ret.params.typePlural, 'entries')
})

import test from 'ava'

import requestFromAction from './requestFromAction'

test('should prepare request', (t) => {
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' },
    },
    meta: {
      ident: { id: 'johnf' },
      id: '1234567890',
      cid: '12345',
      gid: '12346',
    },
  }
  const expected = {
    action: 'SET',
    params: {
      id: 'johnf',
      type: 'user',
    },
    data: { name: 'John F.' },
    endpoint: null,
    auth: undefined,
    access: { ident: { id: 'johnf' } },
    meta: {
      id: '1234567890',
      cid: '12345',
      gid: '12346',
      typePlural: 'users',
    },
  }

  const ret = requestFromAction(action)

  t.deepEqual(ret, expected)
})

test('should set endpoint options', (t) => {
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' },
    },
    meta: { ident: { id: 'johnf' }, id: '1234567890' },
  }
  const endpoint = {
    options: {
      uri: 'http://api.test/v1',
    },
  }
  const expectedEndpoint = {
    uri: 'http://api.test/v1',
  }

  const ret = requestFromAction(action, { endpoint })

  t.deepEqual(ret.endpoint, expectedEndpoint)
})

test('should set typePlural from plurals dictionary', (t) => {
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }
  const schemas = { entry: { plural: 'entries' } }

  const ret = requestFromAction(action, { schemas })

  t.is(ret.meta.typePlural, 'entries')
})

test('should set auth', (t) => {
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }
  const schemas = { entry: { plural: 'entries' } }
  const auth = { token: 'johnf', secret: 's3cr3t' }

  const ret = requestFromAction(action, { schemas, auth })

  t.deepEqual(ret.auth, auth)
})

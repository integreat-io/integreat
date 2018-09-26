import test from 'ava'

import requestFromAction from './requestFromAction'

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
    meta: {
      typePlural: 'users'
    }
  }

  const ret = requestFromAction(action)

  t.deepEqual(ret, expected)
})

test('should set method for GET action', (t) => {
  const action = {
    type: 'GET',
    payload: {}
  }

  const ret = requestFromAction(action)

  t.is(ret.method, 'QUERY')
})

test('should set method for DELETE action', (t) => {
  const action = {
    type: 'DELETE',
    payload: {}
  }

  const ret = requestFromAction(action)

  t.is(ret.method, 'EXTINCTION')
})

test('should set method for action starting with GET_', (t) => {
  const action = {
    type: 'GET_IDENT',
    payload: {}
  }

  const ret = requestFromAction(action)

  t.is(ret.method, 'QUERY')
})

test('should set method for action starting with SET_', (t) => {
  const action = {
    type: 'SET_META',
    payload: {}
  }

  const ret = requestFromAction(action)

  t.is(ret.method, 'MUTATION')
})

test('should set method for action with unknown type', (t) => {
  const action = {
    type: 'SOMETHING_NEW',
    payload: {}
  }

  const ret = requestFromAction(action)

  t.is(ret.method, 'UNKNOWN')
})

test('should set typePlural from plurals dictionary', (t) => {
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }
  const schemas = { entry: { plural: 'entries' } }

  const ret = requestFromAction(action, { schemas })

  t.is(ret.meta.typePlural, 'entries')
})

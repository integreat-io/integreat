import test from 'ava'
import dispatch from '../tests/helpers/dispatch.js'

import authenticator from './token.js'

// Setup

const action = {
  type: 'GET',
  payload: { type: 'entry' },
  meta: { ident: { id: 'johnf' } },
}

const options = { token: 'someToken' }

// Tests -- authenticate

test('authenticate should return granted when token is set', async (t) => {
  const expected = {
    status: 'granted',
    token: 'someToken',
    encode: false,
    type: undefined,
  }

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  t.deepEqual(ret, expected)
})

test('authenticate should return first token when array of tokens is given', async (t) => {
  const options = { token: ['someToken', 'someOtherToken'] }
  const expected = {
    status: 'granted',
    token: 'someToken',
    encode: false,
    type: undefined,
  }

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  t.deepEqual(ret, expected)
})

test('authenticate should return refused when token is not set', async (t) => {
  const options = {}
  const expected = { status: 'refused' }

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  t.deepEqual(ret, expected)
})

// Tests -- isAuthenticated

test('isAuthenticated should return false when no authentication', (t) => {
  const authentication = null

  t.false(authenticator.isAuthenticated(authentication, options, action))
})

test('isAuthenticated should return true when authentication is granted and token is set', (t) => {
  const authentication = { status: 'granted', token: 'someToken' }

  t.true(authenticator.isAuthenticated(authentication, options, action))
})

// Test - validate

test('validate should return response with the ident given by identId when token is given in the action headers', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      headers: { Authorization: 'Bearer someToken' },
    },
  }
  const options = { token: 'someToken', type: 'Bearer', identId: 'johnf' }
  const authentication = { status: 'granted' }
  const expected = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await authenticator.validate!(
    authentication,
    options,
    action,
    dispatch,
  )

  t.deepEqual(ret, expected)
})

test('validate should return response with the ident given by identId when auth header is lowercase', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      headers: { authorization: 'Bearer someToken' },
    },
  }
  const options = { token: 'someToken', type: 'Bearer', identId: 'johnf' }
  const authentication = { status: 'granted' }
  const expected = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await authenticator.validate!(
    authentication,
    options,
    action,
    dispatch,
  )

  t.deepEqual(ret, expected)
})

test('validate should return response with the ident given by identId when token is given with no type', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      headers: { Authorization: 'someToken' },
    },
  }
  const options = { token: 'someToken', identId: 'johnf' }
  const authentication = { status: 'granted' }
  const expected = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await authenticator.validate!(
    authentication,
    options,
    action,
    dispatch,
  )

  t.deepEqual(ret, expected)
})

test('validate should return response with the ident given by identId when token match one of several possible', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      headers: { Authorization: 'Bearer otherToken' },
    },
  }
  const options = {
    token: ['someToken', 'otherToken'],
    type: 'Bearer',
    identId: 'johnf',
  }
  const authentication = { status: 'granted' }
  const expected = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await authenticator.validate!(
    authentication,
    options,
    action,
    dispatch,
  )

  t.deepEqual(ret, expected)
})

test('validate should return autherror when wrong token is given in the action headers', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      headers: { Authorization: 'Bearer wrongToken' },
    },
  }
  const options = { token: 'someToken', type: 'Bearer', identId: 'johnf' }
  const authentication = { status: 'granted' }
  const expected = {
    status: 'autherror',
    error: 'Invalid credentials',
    reason: 'invalidauth',
  }

  const ret = await authenticator.validate!(
    authentication,
    options,
    action,
    dispatch,
  )

  t.deepEqual(ret, expected)
})

test('validate should return autherror when wrong type is given in the action headers', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      headers: { Authorization: 'Basic someToken' },
    },
  }
  const options = { token: 'someToken', type: 'Bearer', identId: 'johnf' }
  const authentication = { status: 'granted' }
  const expected = {
    status: 'autherror',
    error: 'Invalid credentials',
    reason: 'invalidauth',
  }

  const ret = await authenticator.validate!(
    authentication,
    options,
    action,
    dispatch,
  )

  t.deepEqual(ret, expected)
})

test('validate should return autherror when no auth header is given in the action headers', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      headers: {}, // No Authorization
    },
  }
  const options = { token: 'someToken', type: 'Bearer', identId: 'johnf' }
  const authentication = { status: 'granted' }
  const expected = {
    status: 'noaccess',
    error: 'Authentication required',
    reason: 'noauth',
  }

  const ret = await authenticator.validate!(
    authentication,
    options,
    action,
    dispatch,
  )

  t.deepEqual(ret, expected)
})

// Tests -- asHttpHeaders

test('asHttpHeaders should return auth header with token', (t) => {
  const authentication = {
    status: 'granted',
    token: 'someToken',
    type: 'Bearer',
  }
  const expected = { Authorization: 'Bearer someToken' }

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asHttpHeaders should return auth header with given type', (t) => {
  const authentication = {
    status: 'granted',
    token: 'someToken',
    type: 'Basic',
  }
  const expected = { Authorization: 'Basic someToken' }

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asHttpHeaders should return auth header without type', (t) => {
  const authentication = {
    status: 'granted',
    token: 'someToken',
  }
  const expected = { Authorization: 'someToken' }

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asHttpHeaders should base64 encode token when options say so', (t) => {
  const authentication = {
    status: 'granted',
    token: 'someToken',
    type: 'Bearer',
    encode: true,
  }
  const expected = { Authorization: 'Bearer c29tZVRva2Vu' }

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asHttpHeaders should return empty object when no token', (t) => {
  const authentication = { status: 'granted' }

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, {})
})

test('asHttpHeaders should return empty object when not granted', (t) => {
  const authentication = {
    status: 'refused',
    token: 'someToken',
    type: 'Bearer',
  }
  const expected = {}

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

// Tests -- asObject

test('asObject should return token and type', (t) => {
  const authentication = {
    status: 'granted',
    token: 'someToken',
    type: 'Basic',
  }
  const expected = { token: 'someToken', type: 'Basic' }

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should encode token', (t) => {
  const authentication = {
    status: 'granted',
    token: 'someToken',
    encode: true,
    type: 'Bearer',
  }
  const expected = { token: 'c29tZVRva2Vu', type: 'Bearer' }

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return empty object when not granted', (t) => {
  const authentication = {
    status: 'refused',
    token: 'someToken',
    type: 'Basic',
  }
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return empty object when no token', (t) => {
  const authentication = {
    status: 'granted',
    token: null,
    encode: true,
    type: 'Bearer',
  }
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return empty object when no authentication', (t) => {
  const authentication = null
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

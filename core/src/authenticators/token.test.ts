import test from 'ava'

import authenticator from './token'

// Tests

test('authenticate should return granted when token is set', async t => {
  const options = { token: 'someToken' }
  const expected = {
    status: 'granted',
    token: 'someToken',
    encode: false,
    type: 'Bearer'
  }

  const ret = await authenticator.authenticate(options)

  t.deepEqual(ret, expected)
})

test('authenticate should return refused when token is not set', async t => {
  const options = {}
  const expected = { status: 'refused' }

  const ret = await authenticator.authenticate(options)

  t.deepEqual(ret, expected)
})

test('isAuthenticated should return false when no authentication', t => {
  const authentication = null

  t.false(authenticator.isAuthenticated(authentication))
})

test('isAuthenticated should return true when authentication is granted and token is set', t => {
  const authentication = { status: 'granted', token: 'someToken' }

  t.true(authenticator.isAuthenticated(authentication))
})

test('asHttpHeaders should return auth header with token', t => {
  const authentication = {
    status: 'granted',
    token: 'someToken',
    type: 'Bearer'
  }
  const expected = { Authorization: 'Bearer someToken' }

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asHttpHeaders should return auth header with given type', t => {
  const authentication = {
    status: 'granted',
    token: 'someToken',
    type: 'Basic'
  }
  const expected = { Authorization: 'Basic someToken' }

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asHttpHeaders should base64 encode token when options say so', t => {
  const authentication = {
    status: 'granted',
    token: 'someToken',
    type: 'Bearer',
    encode: true
  }
  const expected = { Authorization: 'Bearer c29tZVRva2Vu' }

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asHttpHeaders should return empty object when no token', t => {
  const authentication = { status: 'granted' }

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, {})
})

test('asHttpHeaders should return empty object when not granted', t => {
  const authentication = {
    status: 'refused',
    token: 'someToken',
    type: 'Bearer'
  }
  const expected = {}

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return token and type', t => {
  const authentication = {
    status: 'granted',
    token: 'someToken',
    type: 'Basic'
  }
  const expected = { token: 'someToken', type: 'Basic' }

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should encode token', t => {
  const authentication = {
    status: 'granted',
    token: 'someToken',
    encode: true,
    type: 'Bearer'
  }
  const expected = { token: 'c29tZVRva2Vu', type: 'Bearer' }

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return empty object when not granted', t => {
  const authentication = {
    status: 'refused',
    token: 'someToken',
    type: 'Basic'
  }
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return empty object when no token', t => {
  const authentication = {
    status: 'granted',
    token: null,
    encode: true,
    type: 'Bearer'
  }
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return empty object when no authentication', t => {
  const authentication = null
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

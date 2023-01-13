import test from 'ava'

import authenticator from './options.js'

// Setup

const action = {
  type: 'GET',
  payload: { type: 'entry' },
  meta: { ident: { id: 'johnf' } },
}

// Tests

test('authenticate should always grant and return options', async (t) => {
  const options = { username: 'bill', password: 'secret' }
  const expected = { status: 'granted', username: 'bill', password: 'secret' }

  const ret = await authenticator.authenticate(options, action)

  t.deepEqual(ret, expected)
})

test('isAuthenticated should return true when granted', (t) => {
  const authentication = {
    status: 'granted',
    username: 'bill',
    password: 'secret',
  }

  const ret = authenticator.isAuthenticated(authentication, action)

  t.true(ret)
})

test('isAuthenticated should return false when not granted', (t) => {
  const authentication = {
    status: 'refused',
    username: 'bill',
    password: 'secret',
  }

  const ret = authenticator.isAuthenticated(authentication, action)

  t.false(ret)
})

test('isAuthenticated should return false when no authentication', (t) => {
  const authentication = null

  const ret = authenticator.isAuthenticated(authentication, action)

  t.false(ret)
})

test('asHttpHeaders should return the options object', (t) => {
  const authentication = {
    status: 'granted',
    'X-API-Key': 't0k3n',
  }
  const expected = { 'X-API-Key': 't0k3n' }

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asHttpHeaders should return empty object when not granted', (t) => {
  const authentication = {
    status: 'refused',
    'X-API-Key': 't0k3n',
  }
  const expected = {}

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return the options object', (t) => {
  const authentication = {
    status: 'granted',
    username: 'bill',
    password: 'secret',
  }
  const expected = { username: 'bill', password: 'secret' }

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return empty object when not granted', (t) => {
  const authentication = {
    status: 'refused',
    username: 'bill',
    password: 'secret',
  }
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

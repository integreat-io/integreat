import test from 'ava'

import authenticator from './options'

// Tests

test('authenticate should always grant and return options', async (t) => {
  const options = { username: 'bill', password: 'secret' }
  const expected = { status: 'granted', username: 'bill', password: 'secret' }

  const ret = await authenticator.authenticate(options)

  t.deepEqual(ret, expected)
})

test('isAuthenticated should return true when granted', (t) => {
  const authentication = {
    status: 'granted',
    username: 'bill',
    password: 'secret',
  }

  const ret = authenticator.isAuthenticated(authentication)

  t.true(ret)
})

test('isAuthenticated should return false when not granted', (t) => {
  const authentication = {
    status: 'refused',
    username: 'bill',
    password: 'secret',
  }

  const ret = authenticator.isAuthenticated(authentication)

  t.false(ret)
})

test('isAuthenticated should return false when no authentication', (t) => {
  const authentication = null

  const ret = authenticator.isAuthenticated(authentication)

  t.false(ret)
})

test('asHttpHeaders should return the options object', (t) => {
  const authentication = { status: 'granted', 'custom-header': 's3cr3t' }
  const expected = { 'custom-header': 's3cr3t' }

  const ret = authenticator.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return the options object', (t) => {
  const authentication = {
    status: 'granted',
    username: 'bill',
    password: 'secret',
  }
  const expected = { username: 'bill', password: 'secret' }

  const ret = authenticator.asObject(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return empty object when not granted', (t) => {
  const authentication = {
    status: 'refused',
    username: 'bill',
    password: 'secret',
  }
  const expected = {}

  const ret = authenticator.asObject(authentication)

  t.deepEqual(ret, expected)
})

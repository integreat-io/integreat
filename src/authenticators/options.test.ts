import test from 'ava'
import dispatch from '../tests/helpers/dispatch.js'

import authenticator from './options.js'

// Setup

const action = {
  type: 'GET',
  payload: {
    type: 'entry',
    headers: { ['X-API-Key']: 't0k3n' },
    role: 'admin',
  },
  meta: { ident: { id: 'johnf' } },
}

const options = { username: 'bill', password: 'secret' }
const authentication = { status: 'granted' }

// Tests - authenticate

test('authenticate should always grant and return options', async (t) => {
  const expected = { status: 'granted', username: 'bill', password: 'secret' }

  const ret = await authenticator.authenticate(options, action, dispatch)

  t.deepEqual(ret, expected)
})

// Tests - isAuthenticated

test('isAuthenticated should return true when granted', (t) => {
  const authentication = {
    status: 'granted',
    username: 'bill',
    password: 'secret',
  }

  const ret = authenticator.isAuthenticated(authentication, options, action)

  t.true(ret)
})

test('isAuthenticated should return false when not granted', (t) => {
  const authentication = {
    status: 'refused',
    username: 'bill',
    password: 'secret',
  }

  const ret = authenticator.isAuthenticated(authentication, options, action)

  t.false(ret)
})

test('isAuthenticated should return false when no authentication', (t) => {
  const authentication = null

  const ret = authenticator.isAuthenticated(authentication, options, action)

  t.false(ret)
})

// Test - validate

test('validate should return response with the ident given by identId when all options are found in the provided action', async (t) => {
  const options = {
    identId: 'johnf',
    'payload.headers.X-API-Key': 't0k3n',
    'payload.role': 'admin',
  }
  const expected = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await authenticator.validate!(
    authentication,
    options,
    action,
    dispatch,
  )

  t.deepEqual(ret, expected)
})

test('validate should return response with the ident when one value in an array in options match', async (t) => {
  const options = {
    identId: 'johnf',
    'payload.headers.X-API-Key': 't0k3n',
    'payload.role': ['editor', 'admin'],
  }
  const expected = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await authenticator.validate!(
    authentication,
    options,
    action,
    dispatch,
  )

  t.deepEqual(ret, expected)
})

test('validate should return response with the ident when options has no props to match', async (t) => {
  const options = { identId: 'johnf' }
  const expected = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await authenticator.validate!(
    authentication,
    options,
    action,
    dispatch,
  )

  t.deepEqual(ret, expected)
})

test('validate should return autherror error when some options are found, but their values does not match', async (t) => {
  const options = {
    identId: 'johnf',
    'payload.headers.X-API-Key': '0th3r',
    'payload.role': 'admin',
  }
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

test('validate should return autherror error when none of the options in an array match', async (t) => {
  const options = {
    identId: 'johnf',
    'payload.headers.X-API-Key': ['0th3r', '1th3r'],
  }
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

test('validate should return noaccess error when none of the options are found in the provided action', async (t) => {
  const options = { identId: 'johnf', 'payload.headers.Other-Key': 't0k3n' }
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

test('validate should return noaccess error when no authentication or action are provided', async (t) => {
  const options = { identId: 'johnf', 'payload.headers.X-API-Key': 't0k3n' }
  const authentication = null
  const action = null
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

// Tests - asHttpHeaders

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

// Tests - asObject

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

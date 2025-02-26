import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import { IdentType } from '../types.js'

import authenticator from './action.js'

// Setup

const options = { action: 'GET', payload: { type: 'session' } }
const action = {
  type: 'GET',
  payload: { type: 'entry', id: 'ent1' },
  meta: { ident: { id: 'johnf' } },
}

// Tests -- authenticate

test('authenticate should dispatch action and return response data as authentication', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: { auth: { token: 't0k3n' }, expire: 1715959020000 },
  })
  const options = { action: 'GET', payload: { type: 'session' } }
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
    meta: {
      ident: { id: 'johnf' },
      id: '10005',
      cid: '10001',
      project: 'proj1',
    },
  }
  const expected = {
    status: 'granted',
    auth: { token: 't0k3n' },
    expire: 1715959020000,
  }
  const expectedAuthAction = {
    type: 'GET',
    payload: { type: 'session' },
    meta: { ident: { id: 'johnf' }, cid: '10001', project: 'proj1' },
  }

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expectedAuthAction)
})

test('authenticate should dispatch with anonymous when no action is proviced', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: { auth: { token: 't0k3n' } } })
  const action = null
  const expected = { status: 'granted', auth: { token: 't0k3n' } }
  const expectedAuthAction = {
    type: 'GET',
    payload: { type: 'session' },
    meta: { ident: { id: 'anonymous', type: IdentType.Anon } },
  }

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expectedAuthAction)
})

test('authenticate should return authentication without expire', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: { auth: { token: 't0k3n' } }, // No expire
  })
  const expected = {
    status: 'granted',
    auth: { token: 't0k3n' },
  }

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
})

test('authenticate should use default expire when none is returned in the data', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: { auth: { token: 't0k3n' } }, // No expire
  })
  const options = {
    action: 'GET',
    payload: { type: 'session' },
    expireIn: 3600000, // Default expire
  }
  const before = Date.now()

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  const after = Date.now()
  assert.equal(ret.status, 'granted')
  assert.equal(typeof ret.expire, 'number')
  assert.equal((ret.expire as number) >= before + 3600000, true)
  assert.equal((ret.expire as number) <= after + 3600000, true)
  assert.equal(dispatch.callCount, 1)
})

test('authenticate should use default expire as ms string when none is returned in the data', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: { auth: { token: 't0k3n' } }, // No expire
  })
  const options = {
    action: 'GET',
    payload: { type: 'session' },
    expireIn: '1h', // Default expire
  }
  const before = Date.now()

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  const after = Date.now()
  assert.equal(ret.status, 'granted')
  assert.equal(typeof ret.expire, 'number')
  assert.equal((ret.expire as number) >= before + 3600000, true)
  assert.equal((ret.expire as number) <= after + 3600000, true)
  assert.equal(dispatch.callCount, 1)
})

test('authenticate should return authentication with empty auth', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: { expire: 1715959020000 }, // No auth
  })
  const expected = {
    status: 'granted',
    auth: {},
    expire: 1715959020000,
  }

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
})

test('authenticate should refuse when dispatch responds with no data', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok' }) // No data
  const expected = {
    status: 'refused',
    error: 'Auth action responded without a valid data object',
  }

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
})

test('authenticate should refuse when dispatch responds with invalid auth data', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: { auth: 'What?' } }) // Invalid auth data
  const expected = {
    status: 'refused',
    error: 'Auth action responded without a valid data object',
  }

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
})

test('authenticate should refuse when dispatch responds with error', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'timeout', error: 'Too slow' })
  const expected = {
    status: 'refused',
    error: 'Auth action failed. [timeout] Too slow',
  }

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
})

test('authenticate should refuse when not a valid action', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: { auth: { token: 't0k3n' } } })
  const options = {} // No action is defined
  const expected = {
    status: 'refused',
    error: 'The options did not define a valid action',
  }

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 0)
})

// Tests -- isAuthenticated

test('isAuthenticated should return true when authentication is granted and auth is set', () => {
  const authentication = { status: 'granted', auth: { token: 't0k3n' } }

  assert.equal(
    authenticator.isAuthenticated(authentication, options, action),
    true,
  )
})

test('isAuthenticated should return true even when auth is object is null', () => {
  const authentication = { status: 'granted', auth: null }

  assert.equal(
    authenticator.isAuthenticated(authentication, options, action),
    true,
  )
})

test('isAuthenticated should return true when expire is in the future', () => {
  const authentication = {
    status: 'granted',
    auth: { token: 't0k3n' },
    expire: Date.now() + 3600000,
  }

  assert.equal(
    authenticator.isAuthenticated(authentication, options, action),
    true,
  )
})

test('isAuthenticated should return false when expire is in the past', () => {
  const authentication = {
    status: 'granted',
    auth: { token: 't0k3n' },
    expire: Date.now() - 3600000,
  }

  assert.equal(
    authenticator.isAuthenticated(authentication, options, action),
    false,
  )
})

test('isAuthenticated should return false when no authentication', () => {
  const authentication = null

  assert.equal(
    authenticator.isAuthenticated(authentication, options, action),
    false,
  )
})

// Tests -- asObject

test('asObject should return auth object', () => {
  const authentication = {
    status: 'granted',
    auth: { token: 't0k3n' },
  }
  const expected = { token: 't0k3n' }

  const ret = authenticator.authentication.asObject(authentication)

  assert.deepEqual(ret, expected)
})

test('asObject should return empty object when not granted', () => {
  const authentication = {
    status: 'refused',
    auth: { token: 't0k3n' },
  }
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  assert.deepEqual(ret, expected)
})

test('asObject should return empty object when no auth object', () => {
  const authentication = {
    status: 'granted',
    auth: null,
  }
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  assert.deepEqual(ret, expected)
})

test('asObject should return empty object when expired', () => {
  const authentication = {
    status: 'granted',
    auth: { token: 't0k3n' },
    expire: Date.now() - 3600000,
  }
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  assert.deepEqual(ret, expected)
})

test('asObject should return empty object when no authentication', () => {
  const authentication = null
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  assert.deepEqual(ret, expected)
})

// Tests -- asHttpHeaders

test('asHttpHeaders should return auth object', () => {
  const authentication = {
    status: 'granted',
    auth: { Authorization: 't0k3n' },
  }
  const expected = { Authorization: 't0k3n' }

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  assert.deepEqual(ret, expected)
})

test('asHttpHeaders should return empty object when not granted', () => {
  const authentication = {
    status: 'refused',
    auth: { Authorization: 't0k3n' },
  }
  const expected = {}

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  assert.deepEqual(ret, expected)
})

test('asHttpHeaders should return empty object when no auth object', () => {
  const authentication = {
    status: 'granted',
    auth: null,
  }
  const expected = {}

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  assert.deepEqual(ret, expected)
})

test('asHttpHeaders should return empty object when expired', () => {
  const authentication = {
    status: 'granted',
    auth: { token: 't0k3n' },
    expire: Date.now() - 3600000,
  }
  const expected = {}

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  assert.deepEqual(ret, expected)
})

test('asHttpHeaders should return empty object when no authentication', () => {
  const authentication = null
  const expected = {}

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  assert.deepEqual(ret, expected)
})

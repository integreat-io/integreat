import test from 'ava'
import sinon from 'sinon'
import type { AuthOptions } from './types.js'
import type { Authenticator, Transporter } from '../types.js'

import Auth from './Auth.js'

// Setup

const authenticator: Authenticator = {
  authenticate: async (options, _action) => ({
    status: options?.token === 't0k3n' ? 'granted' : 'refused',
    expired: options?.expired,
    token: options?.token,
    ...(options?.token === 't0k3n' ? {} : { error: 'Wrong token' }),
  }),

  isAuthenticated: (authentication, _options, _action) =>
    !!authentication && !authentication.expired,

  authentication: {
    asHttpHeaders: (auth) => (auth?.token ? { Authorization: auth.token } : {}),
    asObject: (auth) => (auth?.token ? { token: auth.token } : {}),
  },
}

const transporter = {
  authentication: 'asHttpHeaders',
} as unknown as Transporter

const action = {
  type: 'GET',
  payload: { type: 'entry' },
  meta: { ident: { id: 'johnf' } },
}

const id = 'auth1'
const options = { token: 't0k3n' }

// Tests

test('should create Auth instance', (t) => {
  const auth = new Auth(id, authenticator, options)

  t.truthy(auth)
  t.is(auth.id, 'auth1')
})

test('should authenticate and return true on success', async (t) => {
  const auth = new Auth(id, authenticator, options)

  const ret = await auth.authenticate(action)

  t.true(ret)
})

test('should return false when not authenticated', async (t) => {
  const options = { token: 'wr0ng' }
  const auth = new Auth(id, authenticator, options)

  const ret = await auth.authenticate(action)

  t.false(ret)
})

test('should handle missing options', async (t) => {
  const options = undefined
  const auth = new Auth(id, authenticator, options)

  const ret = await auth.authenticate(action)

  t.false(ret)
})

test('should not reauthenticated when already authenticated', async (t) => {
  const reauthenticator = { ...authenticator }
  const authSpy = sinon.spy(reauthenticator, 'authenticate')
  const auth = new Auth(id, reauthenticator, options)

  await auth.authenticate(action)
  const ret = await auth.authenticate(action)

  t.is(authSpy.callCount, 1)
  t.true(ret)
})

test('should ask the authenticator if the authentication is still valid and reauthenticate', async (t) => {
  const reauthenticator = { ...authenticator }
  const authSpy = sinon.spy(reauthenticator, 'authenticate')
  // `expired: true` makes our fake authenticator fail existing authentications
  // in isAuthenticated and trigger a second authentication
  const options = { token: 't0k3n', expired: true }
  const auth = new Auth(id, reauthenticator, options)

  const ret1 = await auth.authenticate(action)
  const ret2 = await auth.authenticate(action)

  t.is(authSpy.callCount, 2)
  t.true(ret1)
  t.true(ret2)
})

test("should pass on options and action to authenticator's isAuthenticated", async (t) => {
  const stubbedAuthenticator = {
    ...authenticator,
    isAuthenticated: sinon.stub().callsFake(authenticator.isAuthenticated),
  }
  const auth = new Auth(id, stubbedAuthenticator, options)

  await auth.authenticate(action) // The first call is to set the status to 'granted', to invoke an isAuthenticated call on next attempt
  await auth.authenticate(action)

  t.is(stubbedAuthenticator.isAuthenticated.callCount, 1)
  t.deepEqual(stubbedAuthenticator.isAuthenticated.args[0][1], options)
  t.deepEqual(stubbedAuthenticator.isAuthenticated.args[0][2], action)
})

test("should pass on action to authenticator's authenticate", async (t) => {
  const stubbedAuthenticator = {
    ...authenticator,
    authenticate: sinon.stub().callsFake(authenticator.authenticate),
  }
  const auth = new Auth(id, stubbedAuthenticator, options)

  await auth.authenticate(action)

  t.is(stubbedAuthenticator.authenticate.callCount, 1)
  t.deepEqual(stubbedAuthenticator.authenticate.args[0][1], action)
})

test('should retry once on timeout', async (t) => {
  let count = 0
  const slowAuthenticator = {
    ...authenticator,
    authenticate: async (_options: AuthOptions | null) => ({
      status: count++ > 0 ? 'granted' : 'timeout',
    }),
  }
  const auth = new Auth(id, slowAuthenticator, options)

  const ret = await auth.authenticate(action)

  t.true(ret)
})

test('should return autherror status on second timeout', async (t) => {
  const slowerAuthenticator = {
    ...authenticator,
    authenticate: async (_options: AuthOptions | null) => ({
      status: 'timeout',
    }),
  }
  const authSpy = sinon.spy(slowerAuthenticator, 'authenticate')
  const auth = new Auth(id, slowerAuthenticator, options)

  const ret = await auth.authenticate(action)

  t.false(ret)
  t.is(authSpy.callCount, 2)
})

test('should return auth object when granted', async (t) => {
  const auth = new Auth(id, authenticator, options)
  const expected = { Authorization: 't0k3n' }

  await auth.authenticate(action)
  const ret = auth.getAuthObject(transporter)

  t.deepEqual(ret, expected)
})

test('should return null for unkown auth method', async (t) => {
  const strangeAdapter = { ...transporter, authentication: 'asUnknown' }
  const auth = new Auth(id, authenticator, options)
  const expected = null

  await auth.authenticate(action)
  const ret = auth.getAuthObject(strangeAdapter)

  t.is(ret, expected)
})

test('should return null when not authenticated', async (t) => {
  const auth = new Auth(id, authenticator, options)
  const expected = null

  const ret = auth.getAuthObject(transporter)

  t.is(ret, expected)
})

test('should return null when authentication was refused', async (t) => {
  const refusingAuthenticator = {
    ...authenticator,
    authenticate: async (_options: AuthOptions | null) => ({
      status: 'refused',
      error: 'Not for you',
    }),
  }
  const auth = new Auth(id, refusingAuthenticator, options)
  const expected = null

  await auth.authenticate(action)
  const ret = auth.getAuthObject(transporter)

  t.is(ret, expected)
})

test('should return status ok when granted', async (t) => {
  const auth = new Auth(id, authenticator, options)
  const expected = { status: 'ok' }

  await auth.authenticate(action)
  const ret = auth.getStatusObject()

  t.deepEqual(ret, expected)
})

test('should return status noaccess when not authenticated', async (t) => {
  const auth = new Auth(id, authenticator, options)
  const expected = { status: 'noaccess' }

  const ret = auth.getStatusObject()

  t.deepEqual(ret, expected)
})

test('should return status noaccess when authentication was refused', async (t) => {
  const refusingAuthenticator = {
    ...authenticator,
    authenticate: async (_options: AuthOptions | null) => ({
      status: 'refused',
      error: 'Not for you',
    }),
  }
  const auth = new Auth(id, refusingAuthenticator, options)
  const expected = {
    status: 'noaccess',
    error: "Authentication attempt for 'auth1' was refused. Not for you",
  }

  await auth.authenticate(action)
  const ret = auth.getStatusObject()

  t.deepEqual(ret, expected)
})

test('should return status autherror on auth error', async (t) => {
  const failingAuthenticator = {
    ...authenticator,
    authenticate: async (_options: AuthOptions | null) => ({
      status: 'timeout',
      error: 'This was too slow',
    }),
  }
  const auth = new Auth(id, failingAuthenticator, options)
  const expected = {
    status: 'autherror',
    error: "Could not authenticate 'auth1'. [timeout] This was too slow",
  }

  await auth.authenticate(action)
  const ret = auth.getStatusObject()

  t.deepEqual(ret, expected)
})

test('should set auth object to action', async (t) => {
  const auth = new Auth(id, authenticator, options)
  const expected = {
    ...action,
    meta: { ...action.meta, auth: { Authorization: 't0k3n' } },
  }

  await auth.authenticate(action)
  const ret = auth.applyToAction(action, transporter)

  t.deepEqual(ret, expected)
})

test('should set auth object to null for unkown auth method', async (t) => {
  const strangeAdapter = { ...transporter, authentication: 'asUnknown' }
  const auth = new Auth(id, authenticator, options)
  const expected = {
    ...action,
    meta: { ...action.meta, auth: null },
  }

  await auth.authenticate(action)
  const ret = auth.applyToAction(action, strangeAdapter)

  t.deepEqual(ret, expected)
})

test('should set status noaccess and auth object to null when not authenticated', async (t) => {
  const auth = new Auth(id, authenticator, options)
  const expected = {
    ...action,
    response: { status: 'noaccess' },
    meta: { ...action.meta, auth: null },
  }

  const ret = auth.applyToAction(action, transporter)

  t.deepEqual(ret, expected)
})

test('should set status noaccess and auth object to null when authentication was refused', async (t) => {
  const refusingAuthenticator = {
    ...authenticator,
    authenticate: async (_options: AuthOptions | null) => ({
      status: 'refused',
      error: 'Not for you',
    }),
  }
  const auth = new Auth(id, refusingAuthenticator, options)
  const expected = {
    ...action,
    response: {
      status: 'noaccess',
      error: "Authentication attempt for 'auth1' was refused. Not for you",
    },
    meta: { ...action.meta, auth: null },
  }

  await auth.authenticate(action)
  const ret = auth.applyToAction(action, transporter)

  t.deepEqual(ret, expected)
})

test('should set status autherror and auth object to null on auth error', async (t) => {
  const failingAuthenticator = {
    ...authenticator,
    authenticate: async (_options: AuthOptions | null) => ({
      status: 'timeout',
      error: 'This was too slow',
    }),
  }
  const auth = new Auth(id, failingAuthenticator, options)
  const expected = {
    ...action,
    response: {
      status: 'autherror',
      error: "Could not authenticate 'auth1'. [timeout] This was too slow",
    },
    meta: { ...action.meta, auth: null },
  }

  await auth.authenticate(action)
  const ret = auth.applyToAction(action, transporter)

  t.deepEqual(ret, expected)
})

// Tests --

test('should authenticate and return as object', async (t) => {
  const auth = new Auth(id, authenticator, options)
  const expected = { token: 't0k3n' }

  const ret = await auth.authenticateAndGetAuthObject(action, 'asObject')

  t.deepEqual(ret, expected)
})

test('should reject when authenticate fails', async (t) => {
  const options = { token: 'wr0ng' }
  const auth = new Auth(id, authenticator, options)

  const err = await t.throwsAsync(
    auth.authenticateAndGetAuthObject(action, 'asObject')
  )

  t.is(err?.message, 'Wrong token')
})

test('should return null for unknown method', async (t) => {
  const auth = new Auth(id, authenticator, options)

  const ret = await auth.authenticateAndGetAuthObject(action, 'asUnknown')

  t.is(ret, null)
})

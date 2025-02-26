import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import dispatch from '../tests/helpers/dispatch.js'
import type { AuthOptions } from './types.js'
import type { Authenticator, Transporter } from '../types.js'

import Auth from './Auth.js'

// Setup

const authAction = { type: 'GET', payload: { type: 'session' } }

const authenticator: Authenticator = {
  id: 'mockauth',

  authenticate: async (options, _action, dispatch) => ({
    status:
      options?.token === 't0k3n' && (await dispatch(authAction)).status === 'ok'
        ? 'granted'
        : 'refused',
    expired: options?.expired,
    token: options?.token,
    ...(options?.token === 't0k3n' ? {} : { error: 'Wrong token' }),
  }),

  isAuthenticated: (authentication, _options, _action) =>
    !!authentication && !authentication.expired,

  validate: async (authentication, options, _action, dispatch) => {
    if (!authentication?.token) {
      return {
        status: 'noaccess',
        error: 'No token',
        reason: 'noauth',
      }
    } else if (
      authentication?.token === options?.token &&
      (await dispatch(authAction)).status === 'ok'
    ) {
      return { status: 'ok', access: { ident: { id: 'johnf' } } }
    } else {
      return {
        status: 'autherror',
        error: 'Wrong token',
        reason: 'invalidauth',
      }
    }
  },

  authentication: {
    asHttpHeaders: (auth) => (auth?.token ? { Authorization: auth.token } : {}),
    asObject: (auth) => (auth?.token ? { token: auth.token } : {}),
  },
}

const transporter = {
  defaultAuthAsMethod: 'asHttpHeaders',
} as unknown as Transporter

const action = {
  type: 'GET',
  payload: { type: 'entry' },
  meta: { ident: { id: 'johnf' } },
}

const id = 'auth1'
const options = { token: 't0k3n' }

// Tests

test('should create Auth instance', () => {
  const auth = new Auth(id, authenticator, options)

  assert.equal(auth.id, 'auth1')
})

// Tests -- authenticate

test('should authenticate and return true on success', async () => {
  const auth = new Auth(id, authenticator, options)

  const ret = await auth.authenticate(action, dispatch)

  assert.equal(ret, true)
})

test('should return false when not authenticated', async () => {
  const options = { token: 'wr0ng' }
  const auth = new Auth(id, authenticator, options)

  const ret = await auth.authenticate(action, dispatch)

  assert.equal(ret, false)
})

test('should handle missing options', async () => {
  const options = undefined
  const auth = new Auth(id, authenticator, options)

  const ret = await auth.authenticate(action, dispatch)

  assert.equal(ret, false)
})

test('should not reauthenticated when already authenticated', async () => {
  const reauthenticator = { ...authenticator }
  const authSpy = sinon.spy(reauthenticator, 'authenticate')
  const auth = new Auth(id, reauthenticator, options)

  await auth.authenticate(action, dispatch)
  const ret = await auth.authenticate(action, dispatch)

  assert.equal(authSpy.callCount, 1)
  assert.equal(ret, true)
})

test('should reauthenticate for different keys', async () => {
  let keyCount = 1
  const reauthenticator: Authenticator = {
    ...authenticator,
    extractAuthKey: (_options, _action) => `key${keyCount++}`, // To get a new key for every call
  }
  const authSpy = sinon.spy(reauthenticator, 'authenticate')
  const auth = new Auth(id, reauthenticator, options)

  await auth.authenticate(action, dispatch)
  const ret = await auth.authenticate(action, dispatch)

  assert.equal(authSpy.callCount, 2)
  assert.equal(ret, true)
})

test('should not reauthenticate for same key', async () => {
  const reauthenticator: Authenticator = {
    ...authenticator,
    extractAuthKey: (_options, _action) => 'key1', // Use same key for every call
  }
  const authSpy = sinon.spy(reauthenticator, 'authenticate')
  const auth = new Auth(id, reauthenticator, options)

  await auth.authenticate(action, dispatch)
  const ret = await auth.authenticate(action, dispatch)

  assert.equal(authSpy.callCount, 1)
  assert.equal(ret, true)
})

test('should pass options and action to extractAuthKey', async () => {
  const extractAuthKey = sinon.stub().returns('key')
  const reauthenticator = { ...authenticator, extractAuthKey }
  const auth = new Auth(id, reauthenticator, options)

  await auth.authenticate(action, dispatch)

  assert.equal(extractAuthKey.callCount, 1)
  assert.deepEqual(extractAuthKey.args[0][0], options)
  assert.deepEqual(extractAuthKey.args[0][1], action)
})

test('should ask the authenticator if the authentication is still valid and reauthenticate', async () => {
  const reauthenticator = { ...authenticator }
  const authSpy = sinon.spy(reauthenticator, 'authenticate')
  // `expired: true` makes our fake authenticator fail existing authentications
  // in isAuthenticated and trigger a second authentication
  const options = { token: 't0k3n', expired: true }
  const auth = new Auth(id, reauthenticator, options)

  const ret1 = await auth.authenticate(action, dispatch)
  const ret2 = await auth.authenticate(action, dispatch)

  assert.equal(authSpy.callCount, 2)
  assert.equal(ret1, true)
  assert.equal(ret2, true)
})

test("should pass on options and action to authenticator's isAuthenticated", async () => {
  const stubbedAuthenticator = {
    ...authenticator,
    isAuthenticated: sinon.stub().callsFake(authenticator.isAuthenticated),
  }
  const auth = new Auth(id, stubbedAuthenticator, options)

  await auth.authenticate(action, dispatch) // The first call is to set the status to 'granted', to invoke an isAuthenticated call on next attempt
  await auth.authenticate(action, dispatch)

  assert.equal(stubbedAuthenticator.isAuthenticated.callCount, 1)
  assert.deepEqual(stubbedAuthenticator.isAuthenticated.args[0][1], options)
  assert.deepEqual(stubbedAuthenticator.isAuthenticated.args[0][2], action)
})

test("should pass on action to authenticator's authenticate", async () => {
  const stubbedAuthenticator = {
    ...authenticator,
    authenticate: sinon.stub().callsFake(authenticator.authenticate),
  }
  const auth = new Auth(id, stubbedAuthenticator, options)

  await auth.authenticate(action, dispatch)

  assert.equal(stubbedAuthenticator.authenticate.callCount, 1)
  assert.deepEqual(stubbedAuthenticator.authenticate.args[0][1], action)
  assert.deepEqual(stubbedAuthenticator.authenticate.args[0][3], null) // No previous authentication object
})

test("should pass on previous authentication to authenticator's authenticate", async () => {
  const stubbedAuthenticator = {
    ...authenticator,
    isAuthenticated: () => false,
    authenticate: sinon.stub().callsFake(authenticator.authenticate),
  }
  const auth = new Auth(id, stubbedAuthenticator, options)
  const expectedAuth = { status: 'granted', token: 't0k3n', expired: undefined }

  await auth.authenticate(action, dispatch)
  await auth.authenticate(action, dispatch)

  assert.equal(stubbedAuthenticator.authenticate.callCount, 2)
  assert.deepEqual(stubbedAuthenticator.authenticate.args[1][3], expectedAuth)
})

test('should retry once on timeout', async () => {
  let count = 0
  const slowAuthenticator = {
    ...authenticator,
    authenticate: async (_options: AuthOptions | null) => ({
      status: count++ > 0 ? 'granted' : 'timeout',
    }),
  }
  const auth = new Auth(id, slowAuthenticator, options)

  const ret = await auth.authenticate(action, dispatch)

  assert.equal(ret, true)
})

test('should return autherror status on second timeout', async () => {
  const slowerAuthenticator = {
    ...authenticator,
    authenticate: async (_options: AuthOptions | null) => ({
      status: 'timeout',
    }),
  }
  const authSpy = sinon.spy(slowerAuthenticator, 'authenticate')
  const auth = new Auth(id, slowerAuthenticator, options)

  const ret = await auth.authenticate(action, dispatch)

  assert.equal(ret, false)
  assert.equal(authSpy.callCount, 2)
})

// Tests -- validate

test('should return response with ident when authentication is valid', async () => {
  const options = { token: 't0k3n' }
  const auth = new Auth(id, authenticator, options)
  const authentication = { status: 'granted', token: 't0k3n' }
  const expected = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await auth.validate(authentication, action, dispatch)

  assert.deepEqual(ret, expected)
})

test('should return autherror when authentication is invalid', async () => {
  const options = { token: 't0k3n' }
  const auth = new Auth(id, authenticator, options)
  const authentication = { status: 'granted', token: 'wr0ng' }
  const expected = {
    status: 'autherror',
    error: 'Authentication was refused. Wrong token',
    reason: 'invalidauth',
    origin: 'auth1',
  }

  const ret = await auth.validate(authentication, action, dispatch)

  assert.deepEqual(ret, expected)
})

test('should return noaccess when authentication is missing', async () => {
  const options = { token: 't0k3n' }
  const auth = new Auth(id, authenticator, options)
  const authentication = { status: 'granted', token: undefined }
  const expected = {
    status: 'noaccess',
    error: 'Authentication was refused. No token',
    reason: 'noauth',
    origin: 'auth1',
  }

  const ret = await auth.validate(authentication, action, dispatch)

  assert.deepEqual(ret, expected)
})

test('should return noaccess when authentication is already refused', async () => {
  const options = { token: 't0k3n' }
  const auth = new Auth(id, authenticator, options)
  const authentication = { status: 'refused', token: 't0k3n' }
  const expected = {
    status: 'noaccess',
    error: 'Authentication was refused',
    origin: 'auth1',
  }

  const ret = await auth.validate(authentication, action, dispatch)

  assert.deepEqual(ret, expected)
})

test('should return autherror when authenticator does not have the validate() method', async () => {
  const authenticatorWithoutValidate = { ...authenticator, validate: undefined }
  const options = { token: 't0k3n' }
  const auth = new Auth(id, authenticatorWithoutValidate, options)
  const authentication = { status: 'granted', token: 't0k3n' }
  const expected = {
    status: 'autherror',
    error:
      "Could not authenticate. Authenticator 'mockauth' doesn't support validation",
    origin: 'auth1',
  }

  const ret = await auth.validate(authentication, action, dispatch)

  assert.deepEqual(ret, expected)
})

// Tests -- getAuthObject

test('should return auth object when granted', async () => {
  const auth = new Auth(id, authenticator, options)
  const expected = { Authorization: 't0k3n' }

  await auth.authenticate(action, dispatch)
  const ret = auth.getAuthObject(transporter, null)

  assert.deepEqual(ret, expected)
})

test('should return auth object with depricated auth as method prop', async () => {
  const oldTransporter = {
    authentication: 'asHttpHeaders',
  } as unknown as Transporter
  const auth = new Auth(id, authenticator, options)
  const expected = { Authorization: 't0k3n' }

  await auth.authenticate(action, dispatch)
  const ret = auth.getAuthObject(oldTransporter, null)

  assert.deepEqual(ret, expected)
})

test('should return auth object with overriden method from auth definition', async () => {
  const overrideAuthAsMethod = 'asObject'
  const auth = new Auth(id, authenticator, options, overrideAuthAsMethod)
  const expected = { token: 't0k3n' } // This is the format expected from `asObject()`

  await auth.authenticate(action, dispatch)
  const ret = auth.getAuthObject(transporter, null)

  assert.deepEqual(ret, expected)
})

test('should return auth object from authenticator supporting auth keys', async () => {
  const keyAuthenticator: Authenticator = {
    ...authenticator,
    async authenticate(_options, action) {
      return { status: 'granted', token: `t0k3n_${action?.meta?.id}` }
    },
    extractAuthKey: (_options, action) => `key_${action?.meta?.id}`,
  }
  const auth = new Auth(id, keyAuthenticator, options)
  const action1 = { ...action, meta: { ...action.meta, id: 'action1' } }
  const action2 = { ...action, meta: { ...action.meta, id: 'action2' } }
  const expected = { Authorization: 't0k3n_action2' }

  await auth.authenticate(action1, dispatch)
  await auth.authenticate(action2, dispatch)
  const ret = auth.getAuthObject(transporter, action2)

  assert.deepEqual(ret, expected)
})

test('should return null for unknown auth method', async () => {
  const strangeAdapter = { ...transporter, defaultAuthAsMethod: 'asUnknown' }
  const auth = new Auth(id, authenticator, options)
  const expected = null

  await auth.authenticate(action, dispatch)
  const ret = auth.getAuthObject(strangeAdapter, action)

  assert.equal(ret, expected)
})

test('should return null when not authenticated', async () => {
  const auth = new Auth(id, authenticator, options)
  const expected = null

  const ret = auth.getAuthObject(transporter, action)

  assert.equal(ret, expected)
})

test('should return null when authentication was refused', async () => {
  const refusingAuthenticator = {
    ...authenticator,
    authenticate: async (_options: AuthOptions | null) => ({
      status: 'refused',
      error: 'Not for you',
    }),
  }
  const auth = new Auth(id, refusingAuthenticator, options)
  const expected = null

  await auth.authenticate(action, dispatch)
  const ret = auth.getAuthObject(transporter, action)

  assert.equal(ret, expected)
})

// Tests -- getStatusObject

test('should return status ok when granted', async () => {
  const auth = new Auth(id, authenticator, options)
  const expected = { status: 'ok' }

  await auth.authenticate(action, dispatch)
  const ret = auth.getResponseFromAuth()

  assert.deepEqual(ret, expected)
})

test('should return status noaccess when not authenticated', async () => {
  const auth = new Auth(id, authenticator, options)
  const expected = {
    status: 'noaccess',
    error: "Trying to use auth 'auth1' before authentication has been run",
  }

  const ret = auth.getResponseFromAuth()

  assert.deepEqual(ret, expected)
})

test('should return status noaccess when authentication was refused', async () => {
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
    error: "Authentication attempt for auth 'auth1' was refused. Not for you",
  }

  await auth.authenticate(action, dispatch)
  const ret = auth.getResponseFromAuth()

  assert.deepEqual(ret, expected)
})

test('should return status autherror on auth error', async () => {
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
    error: "Could not authenticate auth 'auth1'. [timeout] This was too slow",
  }

  await auth.authenticate(action, dispatch)
  const ret = auth.getResponseFromAuth()

  assert.deepEqual(ret, expected)
})

// Tests -- applyToAction

test('should set auth object to action', async () => {
  const auth = new Auth(id, authenticator, options)
  const expected = {
    ...action,
    meta: { ...action.meta, auth: { Authorization: 't0k3n' } },
  }

  await auth.authenticate(action, dispatch)
  const ret = auth.applyToAction(action, transporter)

  assert.deepEqual(ret, expected)
})

test('should set auth object to action for authenticator supporting keys', async () => {
  const keyAuthenticator: Authenticator = {
    ...authenticator,
    async authenticate(_options, action) {
      return { status: 'granted', token: `t0k3n_${action?.meta?.id}` }
    },
    extractAuthKey: (_options, action) => `key_${action?.meta?.id}`,
  }
  const auth = new Auth(id, keyAuthenticator, options)
  const action1 = { ...action, meta: { ...action.meta, id: 'action1' } }
  const action2 = { ...action, meta: { ...action.meta, id: 'action2' } }
  const expected = {
    ...action2,
    meta: { ...action2.meta, auth: { Authorization: 't0k3n_action2' } },
  }

  await auth.authenticate(action1, dispatch)
  await auth.authenticate(action2, dispatch)
  const ret = auth.applyToAction(action2, transporter)

  assert.deepEqual(ret, expected)
})

test('should set auth object to null for unkown auth method', async () => {
  const strangeAdapter = { ...transporter, defaultAuthAsMethod: 'asUnknown' }
  const auth = new Auth(id, authenticator, options)
  const expected = {
    ...action,
    meta: { ...action.meta, auth: null },
  }

  await auth.authenticate(action, dispatch)
  const ret = auth.applyToAction(action, strangeAdapter)

  assert.deepEqual(ret, expected)
})

test('should set status noaccess and auth object to null when not authenticated', async () => {
  const auth = new Auth(id, authenticator, options)
  const expected = {
    ...action,
    response: {
      status: 'noaccess',
      error: "Trying to use auth 'auth1' before authentication has been run",
    },
    meta: { ...action.meta, auth: null },
  }

  const ret = auth.applyToAction(action, transporter)

  assert.deepEqual(ret, expected)
})

test('should set status noaccess and auth object to null when authentication was refused', async () => {
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
      error: "Authentication attempt for auth 'auth1' was refused. Not for you",
    },
    meta: { ...action.meta, auth: null },
  }

  await auth.authenticate(action, dispatch)
  const ret = auth.applyToAction(action, transporter)

  assert.deepEqual(ret, expected)
})

test('should set status noaccess and auth object to null when authentication was refused for authenticator supporting keys', async () => {
  const refusingAuthenticator: Authenticator = {
    ...authenticator,
    authenticate: async (_options, action) =>
      action?.meta?.id === 'action2'
        ? { status: 'refused', error: 'Not for you' }
        : { status: 'granted', token: `t0k3n_${action?.meta?.id}` },
    extractAuthKey: (_options, action) => `key_${action?.meta?.id}`,
  }
  const auth = new Auth(id, refusingAuthenticator, options)
  const action1 = { ...action, meta: { ...action.meta, id: 'action1' } }
  const action2 = { ...action, meta: { ...action.meta, id: 'action2' } }
  const expected = {
    ...action2,
    response: {
      status: 'noaccess',
      error: "Authentication attempt for auth 'auth1' was refused. Not for you",
    },
    meta: { ...action2.meta, auth: null },
  }

  await auth.authenticate(action1, dispatch)
  await auth.authenticate(action2, dispatch)
  const ret = auth.applyToAction(action2, transporter)

  assert.deepEqual(ret, expected)
})

test('should set status autherror and auth object to null on auth error', async () => {
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
      error: "Could not authenticate auth 'auth1'. [timeout] This was too slow",
    },
    meta: { ...action.meta, auth: null },
  }

  await auth.authenticate(action, dispatch)
  const ret = auth.applyToAction(action, transporter)

  assert.deepEqual(ret, expected)
})

// Tests -- authenticateAndGetAuthObject

test('should authenticate and return as object', async () => {
  const auth = new Auth(id, authenticator, options)
  const expected = { token: 't0k3n' }

  const ret = await auth.authenticateAndGetAuthObject(
    action,
    'asObject',
    dispatch,
  )

  assert.deepEqual(ret, expected)
})

test('should reject when authenticate fails', async () => {
  const options = { token: 'wr0ng' }
  const auth = new Auth(id, authenticator, options)
  const expectedError = { message: 'Wrong token' }

  await assert.rejects(
    auth.authenticateAndGetAuthObject(action, 'asObject', dispatch),
    expectedError,
  )
})

test('should return null for unknown method', async () => {
  const auth = new Auth(id, authenticator, options)

  const ret = await auth.authenticateAndGetAuthObject(
    action,
    'asUnknown',
    dispatch,
  )

  assert.equal(ret, null)
})

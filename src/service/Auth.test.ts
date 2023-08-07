import test from 'ava'
import sinon from 'sinon'
import type { AuthOptions } from './types.js'
import type { Authenticator, Transporter } from '../types.js'

import Auth from './Auth.js'

// Setup

const authenticator: Authenticator = {
  id: 'mockauth',

  authenticate: async (options, _action) => ({
    status: options?.token === 't0k3n' ? 'granted' : 'refused',
    expired: options?.expired,
    token: options?.token,
    ...(options?.token === 't0k3n' ? {} : { error: 'Wrong token' }),
  }),

  isAuthenticated: (authentication, _options, _action) =>
    !!authentication && !authentication.expired,

  validate: async (authentication, options, _action) => {
    if (!authentication?.token) {
      return {
        status: 'noaccess',
        error: 'No token',
        reason: 'noauth',
      }
    } else if (authentication?.token === options?.token) {
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

test('should create Auth instance', (t) => {
  const auth = new Auth(id, authenticator, options)

  t.truthy(auth)
  t.is(auth.id, 'auth1')
})

// Tests -- authenticate

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

test('should reauthenticate for different keys', async (t) => {
  let keyCount = 1
  const reauthenticator: Authenticator = {
    ...authenticator,
    extractAuthKey: (_options, _action) => `key${keyCount++}`, // To get a new key for every call
  }
  const authSpy = sinon.spy(reauthenticator, 'authenticate')
  const auth = new Auth(id, reauthenticator, options)

  await auth.authenticate(action)
  const ret = await auth.authenticate(action)

  t.is(authSpy.callCount, 2)
  t.true(ret)
})

test('should not reauthenticate for same key', async (t) => {
  const reauthenticator: Authenticator = {
    ...authenticator,
    extractAuthKey: (_options, _action) => 'key1', // Use same key for every call
  }
  const authSpy = sinon.spy(reauthenticator, 'authenticate')
  const auth = new Auth(id, reauthenticator, options)

  await auth.authenticate(action)
  const ret = await auth.authenticate(action)

  t.is(authSpy.callCount, 1)
  t.true(ret)
})

test('should pass options and action to extractAuthKey', async (t) => {
  const extractAuthKey = sinon.stub().returns('key')
  const reauthenticator = { ...authenticator, extractAuthKey }
  const auth = new Auth(id, reauthenticator, options)

  await auth.authenticate(action)

  t.is(extractAuthKey.callCount, 1)
  t.deepEqual(extractAuthKey.args[0][0], options)
  t.deepEqual(extractAuthKey.args[0][1], action)
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

// Tests -- validate

test('should return response with ident when authentication is valid', async (t) => {
  const options = { token: 't0k3n' }
  const auth = new Auth(id, authenticator, options)
  const authentication = { status: 'granted', token: 't0k3n' }
  const expected = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await auth.validate(authentication, action)

  t.deepEqual(ret, expected)
})

test('should return autherror when authentication is invalid', async (t) => {
  const options = { token: 't0k3n' }
  const auth = new Auth(id, authenticator, options)
  const authentication = { status: 'granted', token: 'wr0ng' }
  const expected = {
    status: 'autherror',
    error: 'Authentication was refused. Wrong token',
    reason: 'invalidauth',
    origin: 'auth1',
  }

  const ret = await auth.validate(authentication, action)

  t.deepEqual(ret, expected)
})

test('should return noaccess when authentication is missing', async (t) => {
  const options = { token: 't0k3n' }
  const auth = new Auth(id, authenticator, options)
  const authentication = { status: 'granted', token: undefined }
  const expected = {
    status: 'noaccess',
    error: 'Authentication was refused. No token',
    reason: 'noauth',
    origin: 'auth1',
  }

  const ret = await auth.validate(authentication, action)

  t.deepEqual(ret, expected)
})

test('should return noaccess when authentication is already refused', async (t) => {
  const options = { token: 't0k3n' }
  const auth = new Auth(id, authenticator, options)
  const authentication = { status: 'refused', token: 't0k3n' }
  const expected = {
    status: 'noaccess',
    error: 'Authentication was refused',
    origin: 'auth1',
  }

  const ret = await auth.validate(authentication, action)

  t.deepEqual(ret, expected)
})

test('should return autherror when authenticator does not have the validate() method', async (t) => {
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

  const ret = await auth.validate(authentication, action)

  t.deepEqual(ret, expected)
})

// Tests -- getAuthObject

test('should return auth object when granted', async (t) => {
  const auth = new Auth(id, authenticator, options)
  const expected = { Authorization: 't0k3n' }

  await auth.authenticate(action)
  const ret = auth.getAuthObject(transporter, null)

  t.deepEqual(ret, expected)
})

test('should return auth object when granted - with depricated auth as method prop', async (t) => {
  const oldTransporter = {
    authentication: 'asHttpHeaders',
  } as unknown as Transporter
  const auth = new Auth(id, authenticator, options)
  const expected = { Authorization: 't0k3n' }

  await auth.authenticate(action)
  const ret = auth.getAuthObject(oldTransporter, null)

  t.deepEqual(ret, expected)
})

test('should return auth object from authenticator supporting auth keys', async (t) => {
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

  await auth.authenticate(action1)
  await auth.authenticate(action2)
  const ret = auth.getAuthObject(transporter, action2)

  t.deepEqual(ret, expected)
})

test('should return null for unkown auth method', async (t) => {
  const strangeAdapter = { ...transporter, defaultAuthAsMethod: 'asUnknown' }
  const auth = new Auth(id, authenticator, options)
  const expected = null

  await auth.authenticate(action)
  const ret = auth.getAuthObject(strangeAdapter, action)

  t.is(ret, expected)
})

test('should return null when not authenticated', async (t) => {
  const auth = new Auth(id, authenticator, options)
  const expected = null

  const ret = auth.getAuthObject(transporter, action)

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
  const ret = auth.getAuthObject(transporter, action)

  t.is(ret, expected)
})

// Tests -- getStatusObject

test('should return status ok when granted', async (t) => {
  const auth = new Auth(id, authenticator, options)
  const expected = { status: 'ok' }

  await auth.authenticate(action)
  const ret = auth.getResponseFromAuth()

  t.deepEqual(ret, expected)
})

test('should return status noaccess when not authenticated', async (t) => {
  const auth = new Auth(id, authenticator, options)
  const expected = {
    status: 'noaccess',
    error: "Trying to use auth 'auth1' before authentication has been run",
  }

  const ret = auth.getResponseFromAuth()

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
    error: "Authentication attempt for auth 'auth1' was refused. Not for you",
  }

  await auth.authenticate(action)
  const ret = auth.getResponseFromAuth()

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
    error: "Could not authenticate auth 'auth1'. [timeout] This was too slow",
  }

  await auth.authenticate(action)
  const ret = auth.getResponseFromAuth()

  t.deepEqual(ret, expected)
})

// Tests -- applyToAction

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

test('should set auth object to action for authenticator supporting keys', async (t) => {
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

  await auth.authenticate(action1)
  await auth.authenticate(action2)
  const ret = auth.applyToAction(action2, transporter)

  t.deepEqual(ret, expected)
})

test('should set auth object to null for unkown auth method', async (t) => {
  const strangeAdapter = { ...transporter, defaultAuthAsMethod: 'asUnknown' }
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
    response: {
      status: 'noaccess',
      error: "Trying to use auth 'auth1' before authentication has been run",
    },
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
      error: "Authentication attempt for auth 'auth1' was refused. Not for you",
    },
    meta: { ...action.meta, auth: null },
  }

  await auth.authenticate(action)
  const ret = auth.applyToAction(action, transporter)

  t.deepEqual(ret, expected)
})

test('should set status noaccess and auth object to null when authentication was refused for authenticator supporting keys', async (t) => {
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

  await auth.authenticate(action1)
  await auth.authenticate(action2)
  const ret = auth.applyToAction(action2, transporter)

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
      error: "Could not authenticate auth 'auth1'. [timeout] This was too slow",
    },
    meta: { ...action.meta, auth: null },
  }

  await auth.authenticate(action)
  const ret = auth.applyToAction(action, transporter)

  t.deepEqual(ret, expected)
})

// Tests -- authenticateAndGetAuthObject

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

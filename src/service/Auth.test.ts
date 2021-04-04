import test from 'ava'
import sinon = require('sinon')
import { Authenticator, Authentication, AuthOptions } from './types'
import { Transporter } from '../types'

import Auth from './Auth'

// Setup

const authenticator: Authenticator = {
  authenticate: async (options: AuthOptions | null) => ({
    status: options?.token === 't0k3n' ? 'granted' : 'refused',
    expired: options?.expired,
    token: options?.token,
  }),

  isAuthenticated: (authentication: Authentication | null) =>
    !!authentication && !authentication.expired,

  authentication: {
    asHttpHeaders: (auth: Authentication | null) =>
      auth?.token ? { Authorization: auth.token } : {},
  },
}

const transporter = ({
  authentication: 'asHttpHeaders',
} as unknown) as Transporter

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

test('should throw when no authenticator', (t) => {
  const authenticator = undefined

  const err = t.throws(() => new Auth(id, authenticator, options))

  t.true(err instanceof Error)
  t.is(err.message, 'Auth requires an authenticator')
})

test('should authenticate and return true on success', async (t) => {
  const auth = new Auth(id, authenticator, options)

  const ret = await auth.authenticate()

  t.true(ret)
})

test('should return false when not authenticated', async (t) => {
  const options = { token: 'wr0ng' }
  const auth = new Auth(id, authenticator, options)

  const ret = await auth.authenticate()

  t.false(ret)
})

test('should handle missing options', async (t) => {
  const options = undefined
  const auth = new Auth(id, authenticator, options)

  const ret = await auth.authenticate()

  t.false(ret)
})

test('should not reauthenticated when already authenticated', async (t) => {
  const reauthenticator = { ...authenticator }
  const authSpy = sinon.spy(reauthenticator, 'authenticate')
  const auth = new Auth(id, reauthenticator, options)

  await auth.authenticate()
  const ret = await auth.authenticate()

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

  const ret1 = await auth.authenticate()
  const ret2 = await auth.authenticate()

  t.is(authSpy.callCount, 2)
  t.true(ret1)
  t.true(ret2)
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

  const ret = await auth.authenticate()

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

  const ret = await auth.authenticate()

  t.false(ret)
  t.is(authSpy.callCount, 2)
})

test('should set auth object to action', async (t) => {
  const auth = new Auth(id, authenticator, options)
  const expected = {
    ...action,
    meta: { ...action.meta, auth: { Authorization: 't0k3n' } },
  }

  await auth.authenticate()
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

  await auth.authenticate()
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

  await auth.authenticate()
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

  await auth.authenticate()
  const ret = auth.applyToAction(action, transporter)

  t.deepEqual(ret, expected)
})

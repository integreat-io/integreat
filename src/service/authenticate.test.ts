import test from 'ava'
import sinon from 'sinon'

import authenticate from './authenticate'

// Setup

const authenticator = {
  authenticate: async ({ token }) => ({
    status: (token === 'wr0ng') ? 'refused' : 'granted',
    expired: false,
    headers: { Authorization: token }
  }),
  isAuthenticated: (authentication) => authentication && !authentication.expired,
  asHttpHeaders: ({ headers }) => headers
}

const request = {
  action: 'GET',
  params: {},
  access: { ident: { id: 'johnf' } }
}

const adapter = {
  authentication: 'asHttpHeaders'
}

// Tests

test('should authenticate and set authentication object', async (t) => {
  const authOptions = { token: 't0k3n' }
  const expectedAuthentication = {
    status: 'granted',
    expired: false,
    headers: { Authorization: 't0k3n' }
  }

  const ret = await authenticate({ authenticator, authOptions, adapter })({ request })

  t.deepEqual(ret.authentication, expectedAuthentication)
  t.is(typeof ret.response, 'undefined')
})

test('should set auth object on request when authenticated', async (t) => {
  const authOptions = { token: 't0k3n' }
  const expectedAuth = { Authorization: 't0k3n' }

  const ret = await authenticate({ authenticator, authOptions, adapter })({ request })

  t.deepEqual(ret.request.auth, expectedAuth)
})

test('should call setAuthentication with authentication object', async (t) => {
  const authOptions = { token: 't0k3n' }
  const setAuthentication = sinon.stub()
  const expectedAuthentication = {
    status: 'granted',
    expired: false,
    headers: { Authorization: 't0k3n' }
  }

  await authenticate({ authenticator, authOptions, adapter, setAuthentication })({ request })

  t.is(setAuthentication.callCount, 1)
  t.deepEqual(setAuthentication.args[0][0], expectedAuthentication)
})

test('should not reauthenticate when authentication object is already set', async (t) => {
  const authOptions = { token: 'r3authentik4ted' }
  const authentication = {
    status: 'granted',
    expired: false,
    headers: { Authorization: 't0k3n' }
  }
  const setAuthentication = sinon.stub()
  const expectedAuth = { Authorization: 't0k3n' }

  const ret = await authenticate({ authenticator, authOptions, adapter, setAuthentication })({ authentication, request })

  t.deepEqual(ret.authentication, authentication)
  t.is(setAuthentication.callCount, 0)
  t.deepEqual(ret.request.auth, expectedAuth)
})

test('should reauthenticate when isAuthenticated returns false', async (t) => {
  const authOptions = { token: 'r3authentik4ted' }
  const authentication = {
    status: 'granted',
    expired: true,
    headers: { Authorization: 't0k3n' }
  }
  const expected = {
    status: 'granted',
    expired: false,
    headers: { Authorization: 'r3authentik4ted' }
  }

  const ret = await authenticate({ authenticator, authOptions, adapter })({ authentication, request })

  t.deepEqual(ret.authentication, expected)
})

test('should set response with noaccess when authentication is refused', async (t) => {
  const authOptions = { token: 'wr0ng' }
  const expectedAuthentication = {
    status: 'refused',
    expired: false,
    headers: { Authorization: 'wr0ng' }
  }
  const expectedResponse = {
    status: 'noaccess',
    error: 'Authentication was refused',
    access: {
      status: 'refused',
      scheme: 'service',
      ident: { id: 'johnf' }
    }
  }

  const ret = await authenticate({ authenticator, authOptions, adapter })({ request })

  t.deepEqual(ret.authentication, expectedAuthentication)
  t.deepEqual(ret.response, expectedResponse)
  t.is(ret.request.auth, null)
})

test('should set auth object to null for unknown authentication method', async (t) => {
  const adapter = {
    authentication: 'asUnknown'
  }
  const authOptions = { token: 't0k3n' }

  const ret = await authenticate({ authenticator, authOptions, adapter })({ request })

  t.is(ret.request.auth, null)
})

test('should not authenticate when no authenticator', async (t) => {
  const authOptions = { token: 't0k3n' }

  const ret = await authenticate({ authenticator: null, authOptions, adapter })({ request })

  t.is(typeof ret.authentication, 'undefined')
  t.is(typeof ret.response, 'undefined')
})

test('should retry authentication on timeout', async (t) => {
  let attempt = 0
  const timeoutAuthenticator = {
    ...authenticator,
    authenticate: async ({ token }) => ({
      status: (attempt++ === 0) ? 'timeout' : 'granted',
      expired: false,
      headers: { Authorization: token }
    })
  }
  const authOptions = { token: 't0k3n' }
  const expected = {
    status: 'granted',
    expired: false,
    headers: { Authorization: 't0k3n' }
  }

  const ret = await authenticate({
    authenticator: timeoutAuthenticator,
    authOptions,
    adapter
  })({ request })

  t.deepEqual(ret.authentication, expected)
  t.is(typeof ret.response, 'undefined')
})

test('should respond with autherror when timeout after retry', async (t) => {
  const timeoutAuthenticator = {
    ...authenticator,
    authenticate: async ({ token }) => ({
      status: 'timeout',
      expired: false,
      headers: {}
    })
  }
  const authOptions = { token: 't0k3n' }
  const expectedResponse = {
    status: 'autherror',
    error: 'Could not authenticate',
    access: {
      status: 'refused',
      scheme: 'service',
      ident: { id: 'johnf' }
    }
  }

  const ret = await authenticate({
    authenticator: timeoutAuthenticator,
    authOptions,
    adapter
  })({ request })

  t.deepEqual(ret.response, expectedResponse)
})

test('should respond with autherror on error', async (t) => {
  const errorAuthenticator = {
    ...authenticator,
    authenticate: async ({ token }) => ({
      status: 'error',
      error: 'Mistakes have been made',
      expired: false,
      headers: {}
    })
  }
  const authOptions = { token: 't0k3n' }
  const expectedResponse = {
    status: 'autherror',
    error: 'Could not authenticate: Mistakes have been made',
    access: {
      status: 'refused',
      scheme: 'service',
      ident: { id: 'johnf' }
    }
  }

  const ret = await authenticate({
    authenticator: errorAuthenticator,
    authOptions,
    adapter
  })({ request })

  t.deepEqual(ret.response, expectedResponse)
})

test('should respond with autherror on unknown auth status', async (t) => {
  const unknownAuthenticator = {
    ...authenticator,
    authenticate: async () => ({ status: 'unknown' })
  }
  const authOptions = {}
  const expectedResponse = {
    status: 'autherror',
    error: 'Could not authenticate - unknown status from authenticator',
    access: {
      status: 'refused',
      scheme: 'service',
      ident: { id: 'johnf' }
    }
  }

  const ret = await authenticate({
    authenticator: unknownAuthenticator,
    authOptions,
    adapter
  })({ request })

  t.deepEqual(ret.response, expectedResponse)
})

test('should call authenticator.authenticate with request', async (t) => {
  const requestAuthenticator = {
    ...authenticator,
    authenticate: async (authOptions, request) => ({
      status: 'granted',
      expired: false,
      headers: { Authorization: request.access.ident.id }
    })
  }
  const authOptions = {}
  const expectedAuth = { Authorization: 'johnf' }

  const ret = await authenticate({
    authenticator: requestAuthenticator,
    authOptions,
    adapter
  })({ request })

  t.deepEqual(ret.request.auth, expectedAuth)
})

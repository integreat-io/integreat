import test from 'ava'
import { Adapter } from '../types'
import { Auth, AuthOptions, Authentication } from '../auth/types'

import authenticate from './authenticate'

// Setup

const authenticator = {
  authenticate: async ({ token }: AuthOptions) => ({
    status: token === 'wr0ng' ? 'refused' : 'granted',
    expired: false,
    headers: { Authorization: token }
  }),
  isAuthenticated: (authentication: Authentication | null) =>
    !!authentication && !authentication.expired,
  authentication: {
    asHttpHeaders: (auth: Authentication | null) =>
      (auth && (auth.headers as object)) || {}
  }
}

const createAuth = (options: AuthOptions = { token: 't0k3n' }): Auth => ({
  id: 'auth1',
  authenticator,
  options,
  authentication: null
})

const request = {
  action: 'GET',
  params: {},
  access: { ident: { id: 'johnf' } }
}

const adapter = ({
  authentication: 'asHttpHeaders'
} as unknown) as Adapter

// Tests

test('should authenticate and set authentication object', async t => {
  const auth = createAuth()
  const expectedAuthentication = {
    status: 'granted',
    expired: false,
    headers: { Authorization: 't0k3n' }
  }

  const ret = await authenticate({ auth, adapter })({ request })

  t.deepEqual(auth.authentication, expectedAuthentication)
  t.is(ret.response, undefined)
})

test('should set auth object on request when authenticated', async t => {
  const auth = createAuth()
  const expectedAuth = { Authorization: 't0k3n' }

  const ret = await authenticate({ auth, adapter })({ request })

  t.deepEqual(ret.request.auth, expectedAuth)
})

test('should not reauthenticate when authentication object is already set', async t => {
  const authentication = {
    status: 'granted',
    expired: false,
    headers: { Authorization: 't0k3n' }
  }
  const auth = {
    ...createAuth({ token: 'r3authentik4ted' }),
    authentication
  }
  const expectedAuth = { Authorization: 't0k3n' }

  const ret = await authenticate({ auth, adapter })({ request })

  t.deepEqual(ret.request.auth, expectedAuth)
  t.deepEqual(auth.authentication, authentication)
})

test('should reauthenticate when isAuthenticated returns false', async t => {
  const authentication = {
    status: 'granted',
    expired: true,
    headers: { Authorization: 't0k3n' }
  }
  const auth = {
    ...createAuth({ token: 'r3authentik4ted' }),
    authentication
  }
  const expected = {
    status: 'granted',
    expired: false,
    headers: { Authorization: 'r3authentik4ted' }
  }

  const ret = await authenticate({ auth, adapter })({ request })

  t.deepEqual(ret.request.auth, expected.headers)
  t.deepEqual(auth.authentication, expected)
})

test('should set response with noaccess when authentication is refused', async t => {
  const auth = createAuth({ token: 'wr0ng' })
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

  const ret = await authenticate({ auth, adapter })({ request })

  t.deepEqual(ret.response, expectedResponse)
  t.deepEqual(auth.authentication, expectedAuthentication)
  t.is(ret.request.auth, null)
})

test('should set auth object to null for unknown authentication method', async t => {
  const adapter = ({
    authentication: 'asUnknown'
  } as unknown) as Adapter
  const auth = createAuth()

  const ret = await authenticate({ auth, adapter })({ request })

  t.is(ret.request.auth, null)
})

test('should not authenticate when no authenticator', async t => {
  const auth = {
    ...createAuth(),
    authenticator: null
  }

  const ret = await authenticate({ auth, adapter })({ request })

  t.is(ret.response, undefined)
  t.is(auth.authentication, null)
})

test('should retry authentication on timeout', async t => {
  let attempt = 0
  const auth = {
    ...createAuth(),
    authenticator: {
      ...authenticator,
      authenticate: async ({ token }: AuthOptions) => ({
        status: attempt++ === 0 ? 'timeout' : 'granted',
        expired: false,
        headers: { Authorization: token }
      })
    }
  }
  const expected = {
    status: 'granted',
    expired: false,
    headers: { Authorization: 't0k3n' }
  }

  const ret = await authenticate({ auth, adapter })({ request })

  t.deepEqual(auth.authentication, expected)
  t.is(ret.response, undefined)
})

test('should respond with autherror when timeout after retry', async t => {
  const auth = {
    ...createAuth(),
    authenticator: {
      ...authenticator,
      authenticate: async () => ({
        status: 'timeout',
        expired: false,
        headers: {}
      })
    }
  }
  const expectedResponse = {
    status: 'autherror',
    error: 'Could not authenticate',
    access: {
      status: 'refused',
      scheme: 'service',
      ident: { id: 'johnf' }
    }
  }

  const ret = await authenticate({ auth, adapter })({ request })

  t.deepEqual(ret.response, expectedResponse)
})

test('should respond with autherror on error', async t => {
  const auth = {
    ...createAuth(),
    authenticator: {
      ...authenticator,
      authenticate: async () => ({
        status: 'error',
        error: 'Mistakes have been made',
        expired: false,
        headers: {}
      })
    }
  }
  const expectedResponse = {
    status: 'autherror',
    error: 'Could not authenticate: Mistakes have been made',
    access: {
      status: 'refused',
      scheme: 'service',
      ident: { id: 'johnf' }
    }
  }

  const ret = await authenticate({ auth, adapter })({ request })

  t.deepEqual(ret.response, expectedResponse)
})

test('should respond with autherror on unknown auth status', async t => {
  const auth = {
    ...createAuth(),
    authenticator: {
      ...authenticator,
      authenticate: async () => ({ status: 'unknown' })
    }
  }
  const expectedResponse = {
    status: 'autherror',
    error: 'Could not authenticate - unknown status from authenticator',
    access: {
      status: 'refused',
      scheme: 'service',
      ident: { id: 'johnf' }
    }
  }

  const ret = await authenticate({ auth, adapter })({ request })

  t.deepEqual(ret.response, expectedResponse)
})

test('should call authenticator.authenticate with request', async t => {
  const auth = {
    ...createAuth(),
    authenticator: {
      ...authenticator,
      authenticate: async (_authOptions: AuthOptions) => ({
        status: 'granted',
        expired: false,
        headers: { Authorization: request.access.ident.id }
      })
    }
  }
  const expectedAuth = { Authorization: 'johnf' }

  const ret = await authenticate({ auth, adapter })({ request })

  t.deepEqual(ret.request.auth, expectedAuth)
})

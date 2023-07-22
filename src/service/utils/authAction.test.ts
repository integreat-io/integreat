import test from 'ava'
import createSchema from '../../schema/index.js'

import authorizeAction, { isAuthorizedAction } from './authAction.js'

// Setup

const requireAuth = true

const schemas = {
  entry: createSchema({ id: 'entry', access: 'auth' }),
  user: createSchema({ id: 'user', access: { role: 'admin' } }),
}

// Tests

test('should grant request when no type', (t) => {
  const action = {
    type: 'GET',
    payload: { service: 'entries' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
  t.is(ret.type, action.type)
  t.deepEqual(ret.payload, action.payload)
  t.deepEqual(ret.meta?.ident, action.meta.ident)
})

test('should grant request when authorized and schema allows all', (t) => {
  const schemas = { entry: createSchema({ id: 'entry', access: 'all' }) }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
})

test('should refuse request when schema allows none', (t) => {
  const schemas = { entry: createSchema({ id: 'entry', access: 'none' }) }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'entry'",
    reason: 'ALLOW_NONE',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should refuse request when schema has no access method', (t) => {
  const schemas = { entry: createSchema({ id: 'entry' }) }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'entry'",
    reason: 'ACCESS_METHOD_REQUIRED',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should grant request when schema has an identFromField method', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { identFromField: 'id' } }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
})

test('should refuse request when schema has an identFromField method but no ident', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { identFromField: 'id' } }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: undefined },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'entry'",
    reason: 'NO_IDENT',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should grant request when schema has a roleFromField method', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { roleFromField: 'roles' } }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
})

test('should refuse request when schema has an roleFromField method but no ident', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { roleFromField: 'roles' } }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: undefined },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'entry'",
    reason: 'NO_IDENT',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should not override existing error', (t) => {
  const schemas = { entry: createSchema({ id: 'entry', access: 'none' }) }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: {
      status: 'error',
      error: 'Service messed up',
      origin: 'service:entries',
    },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, action.response)
})

test('should override ok status', (t) => {
  const schemas = { entry: createSchema({ id: 'entry', access: 'none' }) }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'ok' },
    meta: { ident: { id: 'ident1' } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'entry'",
    reason: 'ALLOW_NONE',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should grant reqest for action without auth', (t) => {
  const schemas = { entry: createSchema({ id: 'entry' }) }
  const requireAuth = false
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
})

test('should refuse request for specified auth even when auth is not required', (t) => {
  const requireAuth = false
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'entry'",
    reason: 'NO_IDENT',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should grant request with ident when schema requires auth', (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
})

test('should refuse request without ident when schema requires authentication', (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'entry'",
    reason: 'NO_IDENT',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should refuse request with empty ident id when schema requires authentication', (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: '' } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'entry'",
    reason: 'NO_IDENT',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.meta?.ident, { id: '' })
  t.deepEqual(ret.response, expectedResponse)
})

test('should refuse request when type does not match a schema', (t) => {
  const schemas = { entry: createSchema({ id: 'entry' }) }
  const action = {
    type: 'GET',
    payload: { type: 'unknown' },
    meta: { ident: { id: 'ident1' } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'unknown'",
    reason: 'NO_SCHEMA',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should refuse with allow prop on access object', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { allow: 'none' } }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'entry'",
    reason: 'ALLOW_NONE',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should refuse for unknown allow prop', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { allow: 'unknown' } }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'entry'",
    reason: 'ALLOW_NONE',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should grant by role', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { role: 'admin' } }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1', roles: ['admin', 'user'] } },
  }
  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
})

test('should refuse by role', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { role: 'admin' } }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1', roles: ['user'] } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused, role required: 'admin'",
    reason: 'MISSING_ROLE',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should grant by role array', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { role: ['admin', 'superuser'] },
    }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1', roles: ['admin', 'user'] } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
})

test('should refuse by role array', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { role: ['admin', 'superuser'] },
    }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1', roles: ['user'] } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused, roles required: 'admin', 'superuser'",
    reason: 'MISSING_ROLE',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should grant by ident', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { ident: 'ident1' } }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
})

test('should refuse by ident', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { ident: 'ident1' } }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident2' } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused, ident required: 'ident1'",
    reason: 'WRONG_IDENT',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should refuse by ident array', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { ident: ['ident1', 'ident3'] },
    }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident2' } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused, idents required: 'ident1', 'ident3'",
    reason: 'WRONG_IDENT',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should refuse for unknown access prop', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { unknown: 'something' },
    } as any), // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident2' } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'entry'",
    reason: 'ACCESS_METHOD_REQUIRED',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should grant by action access', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { allow: 'none', actions: { GET: { allow: 'auth' } } },
    }),
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
})

test('should grant by action access with short form and using action prefix', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { allow: 'none', actions: { GET: 'auth' } },
    }),
  }
  const action = {
    type: 'GET_SOMETHING',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
})

test('should refuse by action access', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { allow: 'all', actions: { SET: { role: 'admin' } } },
    }),
  }
  const action = {
    type: 'SET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused, role required: 'admin'",
    reason: 'MISSING_ROLE',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should grant with several types', (t) => {
  const action = {
    type: 'GET',
    payload: { type: ['entry', 'user'] },
    meta: { ident: { id: 'ident1', roles: ['admin', 'user'] } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
})

test('should refuse with several types', (t) => {
  const action = {
    type: 'GET',
    payload: { type: ['entry', 'user'] },
    meta: { ident: { id: 'ident1', roles: ['user'] } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused, role required: 'admin'",
    reason: 'MISSING_ROLE',
    origin: 'auth:action',
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('should grant request for root', (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'root', root: true } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  t.true(isAuthorizedAction(ret))
})

test.todo('should grant unset allow when auth is not required')
test.todo('should refuse unset allow when auth is required')

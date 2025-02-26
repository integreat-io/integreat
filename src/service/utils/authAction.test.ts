import test from 'node:test'
import assert from 'node:assert/strict'
import Schema from '../../schema/Schema.js'
import { IdentType } from '../../types.js'
import type { SchemaDef } from '../../schema/types.js'

import authorizeAction, { isAuthorizedAction } from './authAction.js'

// Setup

const requireAuth = true

const schemas = new Map()
schemas.set('entry', new Schema({ id: 'entry', access: 'auth' }))
schemas.set('user', new Schema({ id: 'user', access: { role: 'admin' } }))

// Tests

test('should grant request when no type', () => {
  const action = {
    type: 'GET',
    payload: { service: 'entries' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
  assert.equal(ret.type, action.type)
  assert.deepEqual(ret.payload, action.payload)
  assert.deepEqual(ret.meta?.ident, action.meta.ident)
})

test('should grant request when authorized and schema allows all', () => {
  const schemas = new Map()
  schemas.set('entry', new Schema({ id: 'entry', access: 'all' }))
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should refuse request when schema allows none', () => {
  const schemas = new Map()
  schemas.set('entry', new Schema({ id: 'entry', access: 'none' }))
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should refuse request when schema has no access method', () => {
  const schemas = new Map()
  schemas.set('entry', new Schema({ id: 'entry' }))
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should grant request when schema has an identFromField method', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({ id: 'entry', access: { identFromField: 'id' } }),
  )
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should refuse request when schema has an identFromField method but no ident', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({ id: 'entry', access: { identFromField: 'id' } }),
  )
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should grant request when schema has a roleFromField method', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({ id: 'entry', access: { roleFromField: 'roles' } }),
  )
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should refuse request when schema has an roleFromField method but no ident', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({ id: 'entry', access: { roleFromField: 'roles' } }),
  )
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should not override existing error', () => {
  const schemas = new Map()
  schemas.set('entry', new Schema({ id: 'entry', access: 'none' }))
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, action.response)
})

test('should override ok status', () => {
  const schemas = new Map()
  schemas.set('entry', new Schema({ id: 'entry', access: 'none' }))
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should grant reqest for action without auth', () => {
  const schemas = new Map()
  schemas.set('entry', new Schema({ id: 'entry' }))
  const requireAuth = false
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should refuse request for specified auth even when auth is not required', () => {
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should grant request with ident when schema requires auth', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should refuse request without ident when schema requires authentication', () => {
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should refuse request with empty ident id when schema requires authentication', () => {
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.meta?.ident, { id: '' })
  assert.deepEqual(ret.response, expectedResponse)
})

test('should refuse request when type does not match a schema', () => {
  const schemas = new Map()
  schemas.set('entry', new Schema({ id: 'entry' }))
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should refuse with allow prop on access object', () => {
  const schemas = new Map()
  schemas.set('entry', new Schema({ id: 'entry', access: { allow: 'none' } }))
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should refuse for unknown allow prop', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({ id: 'entry', access: { allow: 'unknown' } }),
  )
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should grant by role', () => {
  const schemas = new Map()
  schemas.set('entry', new Schema({ id: 'entry', access: { role: 'admin' } }))
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1', roles: ['admin', 'user'] } },
  }
  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should refuse by role', () => {
  const schemas = new Map()
  schemas.set('entry', new Schema({ id: 'entry', access: { role: 'admin' } }))
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should grant by role array', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({
      id: 'entry',
      access: { role: ['admin', 'superuser'] },
    }),
  )
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1', roles: ['admin', 'user'] } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should refuse by role array', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({
      id: 'entry',
      access: { role: ['admin', 'superuser'] },
    }),
  )
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should grant by ident', () => {
  const schemas = new Map()
  schemas.set('entry', new Schema({ id: 'entry', access: { ident: 'ident1' } }))
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should refuse by ident', () => {
  const schemas = new Map()
  schemas.set('entry', new Schema({ id: 'entry', access: { ident: 'ident1' } }))
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should refuse by ident array', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({
      id: 'entry',
      access: { ident: ['ident1', 'ident3'] },
    }),
  )
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should grant by ident, even when refused by role', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({ id: 'entry', access: { ident: 'ident1', role: 'admin' } }),
  )
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1', roles: ['user'] } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should grant by role, even when refused by ident', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({ id: 'entry', access: { ident: 'ident1', role: 'admin' } }),
  )
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident2', roles: ['admin'] } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should grant for identFromField, even when refused by role', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({
      id: 'entry',
      access: { identFromField: 'users.id', role: 'admin' },
    }),
  )
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1', roles: ['user'] } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should grant for roleFromField, even when refused by ident', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({
      id: 'entry',
      access: { ident: 'ident1', roleFromField: 'roles' },
    }),
  )
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident2' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should refuse for unknown access prop', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({
      id: 'entry',
      access: { unknown: 'something' },
    } as SchemaDef),
  )
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should grant by action access', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({
      id: 'entry',
      access: { allow: 'none', actions: { GET: { allow: 'auth' } } },
    }),
  )
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should grant by action access with short form and using action prefix', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({
      id: 'entry',
      access: { allow: 'none', actions: { GET: 'auth' } },
    }),
  )
  const action = {
    type: 'GET_SOMETHING',
    payload: { type: 'entry' },
    meta: { ident: { id: 'ident1' } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should refuse by action access', () => {
  const schemas = new Map()
  schemas.set(
    'entry',
    new Schema({
      id: 'entry',
      access: { allow: 'all', actions: { SET: { role: 'admin' } } },
    }),
  )
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should grant with several types', () => {
  const action = {
    type: 'GET',
    payload: { type: ['entry', 'user'] },
    meta: { ident: { id: 'ident1', roles: ['admin', 'user'] } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should refuse with several types', () => {
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

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('should grant request for root', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'root', type: IdentType.Root } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test('should grant request for root with obsolete root flag', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'root', root: true } },
  }

  const ret = authorizeAction(schemas, requireAuth)(action)

  assert.equal(isAuthorizedAction(ret), true)
})

test.todo('should grant unset allow when auth is not required')
test.todo('should refuse unset allow when auth is required')

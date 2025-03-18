import test from 'node:test'
import assert from 'node:assert/strict'
import Schema from '../../schema/Schema.js'
import { IdentType } from '../../types.js'

import { fromService, toService } from './authData.js'

// Setup

const schemas = new Map()
schemas.set(
  'account',
  new Schema({
    id: 'account',
    shape: {
      name: 'string',
    },
    access: {
      identFromField: 'id',
      role: 'admin',
      ident: 'katyf',
      actions: {
        SET: { roleFromField: 'allowAccess.roles', identFromField: 'id' },
        TEST: { allow: 'auth' },
        DELETE: { roleFromField: 'allowAccess.roles' },
      },
    },
  }),
)

const account0 = {
  $type: 'account',
  id: 'johnf',
  name: 'John F.',
  allowAccess: { roles: ['hr', 'superuser'] },
}

const account1 = {
  $type: 'account',
  id: 'lucyk',
  name: 'Lucy K.',
  allowAccess: { roles: 'admin' },
}

// Tests

test('should remove unauthorized items in response data based on identFromField', () => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: [account1, account0, account1] },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    ...action,
    response: {
      ...action.response,
      data: [account0],
      warning: '2 items were removed from response data due to lack of access',
    },
  }

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should remove unauthorized items in response data based on roleFromField', () => {
  const action = {
    type: 'SET',
    payload: { type: 'account' },
    response: { status: 'ok', data: [account1, account0, account1] },
    meta: { ident: { id: 'johnf', roles: ['superuser'] } },
  }
  const expected = {
    ...action,
    response: {
      ...action.response,
      data: [account0],
      warning: '2 items were removed from response data due to lack of access',
    },
  }

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should authorized items by both identFromField and roleFromField', () => {
  const action = {
    type: 'SET',
    payload: { type: 'account' },
    response: { status: 'ok', data: [account0, account1] },
    meta: { ident: { id: 'lucyk', roles: ['hr'] } },
  }
  const expected = {
    ...action,
    response: {
      ...action.response,
      data: [account0, account1],
    },
  }

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should authorized items based on a "fixed" role', () => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: [account1, account0, account1] },
    meta: { ident: { id: 'johnf', roles: ['admin'] } },
  }
  const expected = action // Don't remove anything, as ident has the admin role

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should authorized items based on a "fixed" identity', () => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: [account1, account0, account1] },
    meta: { ident: { id: 'katyf' } },
  }
  const expected = action // Don't remove anything, as ident has the katyf ident

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should remove items of unknown type', () => {
  const action = {
    type: 'SET',
    payload: { type: 'account' },
    response: {
      status: 'ok',
      data: [account0, { $type: 'unknown', id: 'unknown0' }],
    },
    meta: { ident: { id: 'johnf', roles: ['superuser'] } },
  }
  const expected = {
    ...action,
    response: {
      ...action.response,
      data: [account0],
      warning: '1 item was removed from response data due to lack of access',
    },
  }

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should authorize items with no data dependent auth methods', () => {
  const action = {
    type: 'TEST',
    payload: { type: 'account' },
    response: { status: 'ok', data: [account0, account1] },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should authorized one item', () => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: account0 },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    ...action,
    response: {
      ...action.response,
      data: account0,
    },
  }

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should return undefined when one item is unauthorized by ident', () => {
  const action = {
    type: 'GET',
    payload: { type: 'account', targetService: 'entries' },
    response: { status: 'ok', data: account1 },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    ...action,
    response: {
      status: 'noaccess',
      data: undefined,
      error:
        "Authentication was refused for type 'account' on service 'entries'",
      reason: 'WRONG_IDENT',
      origin: 'auth:data',
    },
  }

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should return undefined when one item is unauthorized by role', () => {
  const action = {
    type: 'DELETE',
    payload: { type: 'account' },
    response: { status: 'ok', data: account1 },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    ...action,
    response: {
      status: 'noaccess',
      data: undefined,
      error: "Authentication was refused for type 'account'",
      reason: 'MISSING_ROLE',
      origin: 'auth:data',
    },
  }

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should not override existing error', () => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: {
      status: 'error',
      data: account1,
      error: 'Wrongdoing in service',
      origin: 'service:entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    ...action,
    response: {
      ...action.response,
      data: undefined,
      error: 'Wrongdoing in service',
      origin: 'service:entries',
    },
  }

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should override ok status', () => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: account1 },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    ...action,
    response: {
      status: 'noaccess',
      data: undefined,
      error: "Authentication was refused for type 'account'",
      reason: 'WRONG_IDENT',
      origin: 'auth:data',
    },
  }

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should not authorize non-typed data for regular user', () => {
  const action = {
    type: 'GET',
    payload: { type: 'account', targetService: 'accounts' },
    response: { status: 'ok', data: { something: 'here' } },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    ...action,
    response: {
      status: 'noaccess',
      data: undefined,
      error:
        "Authentication was refused for raw response data from service 'accounts'",
      reason: 'RAW_DATA',
      origin: 'auth:data',
    },
  }

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should authorize non-typed data for regular user when allowed', () => {
  const allowRawResponse = true
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: { something: 'here' } },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = fromService(schemas)(action, allowRawResponse)

  assert.deepEqual(ret, expected)
})

test('should do nothing with no data', () => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should do nothing with null data', () => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: null },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should authorized all items for root', () => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: [account0, account1] },
    meta: { ident: { id: 'root', type: IdentType.Root } },
  }
  const expected = {
    ...action,
    response: {
      ...action.response,
      data: [account0, account1],
    },
  }

  const ret = fromService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should remove unauthorized items in request data', () => {
  const action = {
    type: 'GET',
    payload: { type: 'account', data: [account1, account0, account1] },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    ...action,
    payload: { type: 'account', data: [account0] },
    response: {
      status: undefined,
      warning: '2 items were removed from request data due to lack of access',
    },
  }

  const ret = toService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should not authorize non-typed request data for regular user', () => {
  const action = {
    type: 'GET',
    payload: {
      type: 'account',
      data: { something: 'here' },
      targetService: 'accounts',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    ...action,
    payload: { type: 'account', data: undefined, targetService: 'accounts' },
    response: {
      status: 'noaccess',
      error:
        "Authentication was refused for raw request data to service 'accounts'",
      reason: 'RAW_DATA',
      origin: 'auth:data',
    },
  }

  const ret = toService(schemas)(action)

  assert.deepEqual(ret, expected)
})

test('should authorize non-typed request data for regular user when allowed', () => {
  const allowRawRequest = true
  const action = {
    type: 'GET',
    payload: { type: 'account', data: { something: 'here' } },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = toService(schemas)(action, allowRawRequest)

  assert.deepEqual(ret, expected)
})

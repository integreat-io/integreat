import test from 'ava'
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

test('should remove unauthorized items in response data based on identFromField', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should remove unauthorized items in response data based on roleFromField', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should authorized items by both identFromField and roleFromField', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should authorized items based on a "fixed" role', (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: [account1, account0, account1] },
    meta: { ident: { id: 'johnf', roles: ['admin'] } },
  }
  const expected = action // Don't remove anything, as ident has the admin role

  const ret = fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should authorized items based on a "fixed" identity', (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: [account1, account0, account1] },
    meta: { ident: { id: 'katyf' } },
  }
  const expected = action // Don't remove anything, as ident has the katyf ident

  const ret = fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should remove items of unknown type', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should authorize items with no data dependent auth methods', (t) => {
  const action = {
    type: 'TEST',
    payload: { type: 'account' },
    response: { status: 'ok', data: [account0, account1] },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should authorized one item', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should return undefined when one item is unauthorized by ident', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should return undefined when one item is unauthorized by role', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should not override existing error', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should override ok status', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should not authorize non-typed data for regular user', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should authorize non-typed data for regular user when allowed', (t) => {
  const allowRawResponse = true
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: { something: 'here' } },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = fromService(schemas)(action, allowRawResponse)

  t.deepEqual(ret, expected)
})

test('should do nothing with no data', (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should do nothing with null data', (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: null },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should authorized all items for root', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should remove unauthorized items in request data', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should not authorize non-typed request data for regular user', (t) => {
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

  t.deepEqual(ret, expected)
})

test('should authorize non-typed request data for regular user when allowed', (t) => {
  const allowRawRequest = true
  const action = {
    type: 'GET',
    payload: { type: 'account', data: { something: 'here' } },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = toService(schemas)(action, allowRawRequest)

  t.deepEqual(ret, expected)
})

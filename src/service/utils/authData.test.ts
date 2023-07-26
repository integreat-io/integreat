import test from 'ava'
import Schema from '../../schema/Schema.js'

import { fromService, toService } from './authData.js'

// Setup

const schemas = {
  account: new Schema({
    id: 'account',
    shape: {
      name: 'string',
    },
    access: {
      identFromField: 'id',
      actions: {
        SET: { roleFromField: 'allowAccess.roles', identFromField: 'id' },
        TEST: { allow: 'auth' },
        DELETE: { roleFromField: 'allowAccess.roles' },
      },
    },
  }),
}

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

test('should remove unauthorized items in response data based on identFromField', async (t) => {
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

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should remove unauthorized items in response data based on roleFromField', async (t) => {
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

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should authorized items by both identFromField and roleFromField', async (t) => {
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

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should remove items of unknown type', async (t) => {
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

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should authorize items with no data dependent auth methods', async (t) => {
  const action = {
    type: 'TEST',
    payload: { type: 'account' },
    response: { status: 'ok', data: [account0, account1] },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should authorized one item', async (t) => {
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

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should return undefined when one item is unauthorized by ident', async (t) => {
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

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should return undefined when one item is unauthorized by role', async (t) => {
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

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should not override existing error', async (t) => {
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

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should override ok status', async (t) => {
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

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should not authorize non-typed data for regular user', async (t) => {
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

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should authorize non-typed data for regular user when allowed', async (t) => {
  const allowRawResponse = true
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: { something: 'here' } },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = await fromService(schemas)(action, allowRawResponse)

  t.deepEqual(ret, expected)
})

test('should do nothing with no data', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should do nothing with null data', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: null },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should authorized all items for root', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    response: { status: 'ok', data: [account0, account1] },
    meta: { ident: { id: 'root', root: true } },
  }
  const expected = {
    ...action,
    response: {
      ...action.response,
      data: [account0, account1],
    },
  }

  const ret = await fromService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should remove unauthorized items in request data', async (t) => {
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

  const ret = await toService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should not authorize non-typed request data for regular user', async (t) => {
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

  const ret = await toService(schemas)(action)

  t.deepEqual(ret, expected)
})

test('should authorize non-typed request data for regular user when allowed', async (t) => {
  const allowRawRequest = true
  const action = {
    type: 'GET',
    payload: { type: 'account', data: { something: 'here' } },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = action

  const ret = await toService(schemas)(action, allowRawRequest)

  t.deepEqual(ret, expected)
})

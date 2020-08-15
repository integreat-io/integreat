import test from 'ava'
import createSchema from '../../schema'
import { completeExchange } from '../../utils/exchangeMapping'

import { fromService, toService } from './data'

// Setup

const schemas = {
  account: createSchema({
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

test('should remove unauthorized items in response data based on identFromField', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account' },
    response: { data: [account1, account0, account1] },
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    response: {
      data: [account0],
      warning: '2 items were removed from response data due to lack of access',
    },
  }

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should remove unauthorized items in response data based on roleFromField', (t) => {
  const exchange = completeExchange({
    type: 'SET',
    request: { type: 'account' },
    response: { data: [account1, account0, account1] },
    ident: { id: 'johnf', roles: ['superuser'] },
  })
  const expected = {
    ...exchange,
    response: {
      data: [account0],
      warning: '2 items were removed from response data due to lack of access',
    },
  }

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should authorized items by both identFromField and roleFromField', (t) => {
  const exchange = completeExchange({
    type: 'SET',
    request: { type: 'account' },
    response: { data: [account0, account1] },
    ident: { id: 'lucyk', roles: ['hr'] },
  })
  const expected = {
    ...exchange,
    response: {
      data: [account0, account1],
    },
  }

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should remove items of unknown type', (t) => {
  const exchange = completeExchange({
    type: 'SET',
    request: { type: 'account' },
    response: { data: [account0, { $type: 'unknown', id: 'unknown0' }] },
    ident: { id: 'johnf', roles: ['superuser'] },
  })
  const expected = {
    ...exchange,
    response: {
      data: [account0],
      warning: '1 item was removed from response data due to lack of access',
    },
  }

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should authorize items with no data dependent auth methods', (t) => {
  const exchange = completeExchange({
    type: 'TEST',
    request: { type: 'account' },
    response: { data: [account0, account1] },
    ident: { id: 'johnf' },
  })
  const expected = exchange

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should authorized one item', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account' },
    response: { data: account0 },
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    response: {
      data: account0,
    },
  }

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should return undefined when one item is unauthorized by ident', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account' },
    response: { data: account1 },
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      data: undefined,
      error: "Authentication was refused for type 'account'",
      reason: 'WRONG_IDENT',
    },
  }

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should return undefined when one item is unauthorized by role', (t) => {
  const exchange = completeExchange({
    type: 'DELETE',
    request: { type: 'account' },
    response: { data: account1 },
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      data: undefined,
      error: "Authentication was refused for type 'account'",
      reason: 'MISSING_ROLE',
    },
  }

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should not override existing error', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    status: 'error',
    request: { type: 'account' },
    response: {
      data: account1,
      error: 'Wrongdoing in service',
    },
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    response: {
      data: undefined,
      error: 'Wrongdoing in service',
    },
  }

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should override ok status', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    status: 'ok',
    request: { type: 'account' },
    response: { data: account1 },
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      data: undefined,
      error: "Authentication was refused for type 'account'",
      reason: 'WRONG_IDENT',
    },
  }

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should not authorize non-typed data for regular user', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account' },
    response: { data: { something: 'here' } },
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      data: undefined,
      error: 'Authentication was refused for raw response data',
      reason: 'RAW_DATA',
    },
  }

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should authorize non-typed data for regular user when allowed', (t) => {
  const allowRawResponse = true
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account' },
    response: { data: { something: 'here' } },
    ident: { id: 'johnf' },
  })
  const expected = exchange

  const ret = fromService(schemas)(exchange, allowRawResponse)

  t.deepEqual(ret, expected)
})

test('should do nothing with no data', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account' },
    response: {},
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    response: { data: undefined },
  }

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should do nothing with null data', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account' },
    response: { data: null },
    ident: { id: 'johnf' },
  })
  const expected = exchange

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should authorized all items for root', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account' },
    response: { data: [account0, account1] },
    ident: { id: 'root', root: true },
  })
  const expected = {
    ...exchange,
    response: {
      data: [account0, account1],
    },
  }

  const ret = fromService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should remove unauthorized items in request data', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account', data: [account1, account0, account1] },
    response: {},
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    request: { type: 'account', data: [account0] },
    response: {
      warning: '2 items were removed from request data due to lack of access',
    },
  }

  const ret = toService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should not authorize non-typed request data for regular user', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account', data: { something: 'here' } },
    response: {},
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    request: { type: 'account', data: undefined },
    response: {
      error: 'Authentication was refused for raw request data',
      reason: 'RAW_DATA',
    },
  }

  const ret = toService(schemas)(exchange)

  t.deepEqual(ret, expected)
})

test('should authorize non-typed request data for regular user when allowed', (t) => {
  const allowRawRequest = true
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account', data: { something: 'here' } },
    response: {},
    ident: { id: 'johnf' },
  })
  const expected = exchange

  const ret = toService(schemas)(exchange, allowRawRequest)

  t.deepEqual(ret, expected)
})

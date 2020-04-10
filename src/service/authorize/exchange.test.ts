import test from 'ava'
import { completeExchange } from '../../utils/exchangeMapping'
import createSchema from '../../schema'

import authorizeExchange from './exchange'

// Setup

const requireAuth = true

const schemas = {
  entry: createSchema({ id: 'entry', access: 'auth' }),
  user: createSchema({ id: 'user', access: { role: 'admin' } }),
}

// Tests

test('should grant exchange when no type', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: {},
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should grant exchange when authorized and schema allows all', (t) => {
  const schemas = { entry: createSchema({ id: 'entry', access: 'all' }) }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse exchange when schema allows none', (t) => {
  const schemas = { entry: createSchema({ id: 'entry', access: 'none' }) }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused for type 'entry'",
      reason: 'ALLOW_NONE',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse exchange when schema has no access method', (t) => {
  const schemas = { entry: createSchema({ id: 'entry' }) }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused for type 'entry'",
      reason: 'ACCESS_METHOD_REQUIRED',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should grant exchange when schema has an identFromField method', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { identFromField: 'id' } }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse exchange when schema has an identFromField method but no ident', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { identFromField: 'id' } }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: undefined,
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused for type 'entry'",
      reason: 'NO_IDENT',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should grant exchange when schema has a roleFromField method', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { roleFromField: 'roles' } }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse exchange when schema has an roleFromField method but no ident', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { roleFromField: 'roles' } }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: undefined,
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused for type 'entry'",
      reason: 'NO_IDENT',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should not override existing error', (t) => {
  const schemas = { entry: createSchema({ id: 'entry', access: 'none' }) }
  const exchange = completeExchange({
    type: 'GET',
    status: 'error',
    request: { type: 'entry' },
    response: { error: 'Service messed up' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    status: 'error',
    response: {
      error: 'Service messed up',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should override ok status', (t) => {
  const schemas = { entry: createSchema({ id: 'entry', access: 'none' }) }
  const exchange = completeExchange({
    type: 'GET',
    status: 'ok',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused for type 'entry'",
      reason: 'ALLOW_NONE',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should grant exchange for exchange without auth', (t) => {
  const schemas = { entry: createSchema({ id: 'entry' }) }
  const requireAuth = false
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse exchange for specified auth even when auth is not required', (t) => {
  const requireAuth = false
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused for type 'entry'",
      reason: 'NO_IDENT',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should grant exchange with ident when schema requires auth', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse exchange without ident when schema requires authentication', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused for type 'entry'",
      reason: 'NO_IDENT',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse exchange when type does not match a schema', (t) => {
  const schemas = { entry: createSchema({ id: 'entry' }) }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'unknown' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused for type 'unknown'",
      reason: 'NO_SCHEMA',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse with allow prop on access object', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { allow: 'none' } }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused for type 'entry'",
      reason: 'ALLOW_NONE',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse for unknown allow prop', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { allow: 'unknown' } }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused for type 'entry'",
      reason: 'ALLOW_NONE',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should grant by role', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { role: 'admin' } }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1', roles: ['admin', 'user'] },
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse by role', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { role: 'admin' } }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1', roles: ['user'] },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused, role required: 'admin'",
      reason: 'MISSING_ROLE',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should grant by role array', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { role: ['admin', 'superuser'] },
    }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1', roles: ['admin', 'user'] },
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse by role array', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { role: ['admin', 'superuser'] },
    }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1', roles: ['user'] },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused, roles required: 'admin', 'superuser'",
      reason: 'MISSING_ROLE',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should grant by ident', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { ident: 'ident1' } }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse by ident', (t) => {
  const schemas = {
    entry: createSchema({ id: 'entry', access: { ident: 'ident1' } }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident2' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused, ident required: 'ident1'",
      reason: 'WRONG_IDENT',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse by ident array', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { ident: ['ident1', 'ident3'] },
    }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident2' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused, idents required: 'ident1', 'ident3'",
      reason: 'WRONG_IDENT',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse for unknown access prop', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { unknown: 'something' },
    } as any), // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident2' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused for type 'entry'",
      reason: 'ACCESS_METHOD_REQUIRED',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should grant by action access', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { allow: 'none', actions: { GET: { allow: 'auth' } } },
    }),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should grant by action access with short form and using action prefix', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { allow: 'none', actions: { GET: 'auth' } },
    }),
  }
  const exchange = completeExchange({
    type: 'GET_SOMETHING',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse by action access', (t) => {
  const schemas = {
    entry: createSchema({
      id: 'entry',
      access: { allow: 'all', actions: { SET: { role: 'admin' } } },
    }),
  }
  const exchange = completeExchange({
    type: 'SET',
    request: { type: 'entry' },
    ident: { id: 'ident1' },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused, role required: 'admin'",
      reason: 'MISSING_ROLE',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should grant with several types', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: ['entry', 'user'] },
    ident: { id: 'ident1', roles: ['admin', 'user'] },
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should refuse with several types', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: ['entry', 'user'] },
    ident: { id: 'ident1', roles: ['user'] },
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: {
      error: "Authentication was refused, role required: 'admin'",
      reason: 'MISSING_ROLE',
    },
    authorized: false,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test('should grant exchange for root', (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'root', root: true },
  })
  const expected = {
    ...exchange,
    authorized: true,
  }

  const ret = authorizeExchange(schemas, requireAuth)(exchange)

  t.deepEqual(ret, expected)
})

test.todo('should grant unset allow when auth is not required')
test.todo('should refuse unset allow when auth is required')

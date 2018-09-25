import test from 'ava'

import authorizeRequest from './authorizeRequest'

test('should grant request when authorized', (t) => {
  const schemas = { entry: { id: 'entry', access: 'auth' } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    access: { ident: { id: 'ident1' } }
  }
  const expected = {
    method: 'QUERY',
    params: { type: 'entry' },
    access: {
      status: 'granted',
      scheme: 'auth',
      ident: { id: 'ident1' }
    }
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret, expected)
})

test('should refuse request when not authorized', (t) => {
  const schemas = { entry: { id: 'entry', access: 'auth' } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' }
  }
  const expectedAccess = {
    status: 'refused',
    scheme: 'auth',
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request for all', (t) => {
  const schemas = { entry: { id: 'entry', access: 'all' } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' }
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'all',
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request for none', (t) => {
  const schemas = { entry: { id: 'entry', access: 'none' } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    access: { ident: { id: 'ident1' } }
  }
  const expectedAccess = {
    status: 'refused',
    scheme: 'none',
    ident: { id: 'ident1' }
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant without an access scheme', (t) => {
  const schemas = { entry: { id: 'entry' } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' }
  }
  const expectedAccess = {
    status: 'granted',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse without an access scheme when request has auth', (t) => {
  const schemas = { entry: { id: 'entry' } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    auth: {}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should treat request without schema as no scheme', (t) => {
  const schemas = {}
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    auth: {}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should authorize data', (t) => {
  const schemas = {}
  const request = {
    method: 'MUTATION',
    data: [{ id: 'ent1', type: 'entry' }],
    auth: {}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: 'data',
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant with role scheme', (t) => {
  const schemas = { entry: { id: 'entry', access: { role: 'admin' } } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    access: { ident: { id: 'ident1', roles: ['admin'] } }
  }
  const expectedAccess = {
    status: 'granted',
    scheme: { role: 'admin' },
    ident: { id: 'ident1', roles: ['admin'] }
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse with role scheme', (t) => {
  const schemas = { entry: { id: 'entry', access: { role: 'admin' } } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    access: { ident: { id: 'ident1' } }
  }
  const expectedAccess = {
    status: 'refused',
    scheme: { role: 'admin' },
    ident: { id: 'ident1' }
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant with ident scheme', (t) => {
  const schemas = { entry: { id: 'entry', access: { ident: 'ident1' } } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    access: { ident: { id: 'ident1' } }
  }
  const expectedAccess = {
    status: 'granted',
    scheme: { ident: 'ident1' },
    ident: { id: 'ident1' }
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse with ident scheme', (t) => {
  const schemas = { entry: { id: 'entry', access: { ident: 'ident1' } } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    access: { ident: { id: 'ident2' } }
  }
  const expectedAccess = {
    status: 'refused',
    scheme: { ident: 'ident1' },
    ident: { id: 'ident2' }
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request for auth scheme', (t) => {
  const schemas = { entry: { id: 'entry', access: { allow: 'auth' } } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    access: { ident: { id: 'ident1' } }
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'auth',
    ident: { id: 'ident1' }
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request for all scheme', (t) => {
  const schemas = { entry: { id: 'entry', access: { allow: 'all' } } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' }
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'all',
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request for none scheme', (t) => {
  const schemas = { entry: { id: 'entry', access: { allow: 'none' } } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    access: { ident: { id: 'ident1' } }
  }
  const expectedAccess = {
    status: 'refused',
    scheme: 'none',
    ident: { id: 'ident1' }
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request for empty scheme', (t) => {
  const schemas = { entry: { id: 'entry', access: {} } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' }
  }
  const expectedAccess = {
    status: 'granted',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request for empty scheme when request has auth', (t) => {
  const schemas = { entry: { id: 'entry', access: {} } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    auth: {}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request for roleFromField', (t) => {
  const schemas = { entry: { id: 'entry', access: { roleFromField: 'role' } } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    access: { ident: { id: 'ident1' } }
  }
  const expectedAccess = {
    status: 'granted',
    scheme: { roleFromField: 'role' },
    ident: { id: 'ident1' }
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request for roleFromField when not authenticated', (t) => {
  const schemas = { entry: { id: 'entry', access: { roleFromField: 'role' } } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' }
  }
  const expectedAccess = {
    status: 'refused',
    scheme: { roleFromField: 'role' },
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request for identFromField', (t) => {
  const schemas = { entry: { id: 'entry', access: { identFromField: 'id' } } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    access: { ident: { id: 'ident1' } }
  }
  const expectedAccess = {
    status: 'granted',
    scheme: { identFromField: 'id' },
    ident: { id: 'ident1' }
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request for identFromField when not authenticated', (t) => {
  const schemas = { entry: { id: 'entry', access: { identFromField: 'id' } } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' }
  }
  const expectedAccess = {
    status: 'refused',
    scheme: { identFromField: 'id' },
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request for unknown access prop', (t) => {
  const schemas = { entry: { id: 'entry', access: { unknown: 'something' } } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' },
    access: { ident: { id: 'ident1' } }
  }
  const expectedAccess = {
    status: 'refused',
    scheme: { unknown: 'something' },
    ident: { id: 'ident1' }
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant for method', (t) => {
  const schemas = { entry: {
    id: 'entry',
    access: { allow: 'none', methods: { 'QUERY': { allow: 'all' } } }
  } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' }
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'all',
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse for method', (t) => {
  const schemas = { entry: {
    id: 'entry',
    access: { allow: 'none', methods: { 'QUERY': { access: 'all' } } }
  } }
  const request = {
    method: 'MUTATION',
    params: { type: 'entry' }
  }
  const expectedAccess = {
    status: 'refused',
    scheme: 'none',
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant for method with short form', (t) => {
  const schemas = { entry: {
    id: 'entry',
    access: { allow: 'none', methods: { 'QUERY': 'all' } }
  } }
  const request = {
    method: 'QUERY',
    params: { type: 'entry' }
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'all',
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse for method with short form', (t) => {
  const schemas = { entry: {
    id: 'entry',
    access: { allow: 'all', methods: { 'MUTATION': 'none' } }
  } }
  const request = {
    method: 'MUTATION',
    params: { type: 'entry' }
  }
  const expectedAccess = {
    status: 'refused',
    scheme: 'none',
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should not include unused method accesses in request', (t) => {
  const schemas = { entry: {
    id: 'entry',
    access: { identFromField: 'id', methods: { 'QUERY': { allow: 'all' } } }
  } }
  const request = {
    method: 'MUTATION',
    params: { type: 'entry' }
  }
  const expectedAccess = {
    status: 'refused',
    scheme: { identFromField: 'id' },
    ident: null
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant for root', (t) => {
  const schemas = { entry: {
    id: 'entry',
    access: { access: 'all', methods: { 'MUTATION': 'none' } }
  } }
  const request = {
    method: 'MUTATION',
    params: { type: 'entry' },
    access: { ident: { root: true } }
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'root',
    ident: { root: true }
  }

  const ret = authorizeRequest({ schemas })({ request })

  t.deepEqual(ret.access, expectedAccess)
})

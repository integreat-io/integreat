import test from 'ava'
import createSchema from '../schema'
import createMapping from '../mapping'

import send from './send'

// Setup

const schemas = {
  entry: createSchema({
    id: 'entry',
    plural: 'entries',
    attributes: {
      title: 'string',
      one: { type: 'integer', default: 1 },
      two: 'integer'
    },
    relationships: {
      service: 'service'
    },
    access: 'auth'
  }),
  account: createSchema({
    id: 'account',
    attributes: {
      name: 'string'
    },
    access: {
      identFromField: 'id',
      methods: {
        TEST: 'all'
      }
    }
  })
}

const setupMapping = createMapping({ schemas })

const mappings = {
  entry: setupMapping({
    type: 'entry',
    path: 'items[]',
    attributes: {
      id: 'key',
      title: 'header',
      one: 'one',
      two: 'two'
    },
    relationships: {
      service: '$params.service'
    }
  }),
  account: setupMapping({
    type: 'account',
    attributes: { id: 'id', name: 'name', type: 'type' }
  })
}

const endpoint = { match: {}, options: { uri: ['http://some.api/1.0'] } }

const createAdapter = (overrides = {}) => ({
  authentication: 'asHttpHeaders',
  connect: async (options, auth, connection) => connection,
  serialize: async (request) => request,
  send: async () => ({ status: 'ok', data: [] }),
  normalize: async (response, request) => response,
  disconnect: (connection) => {},
  ...overrides
})

// Tests

test('send should authenticate request', async (t) => {
  const adapter = createAdapter()
  const authenticator = {
    authenticate: async ({ token }) => ({
      status: 'granted',
      headers: { Authorization: token }
    }),
    isAuthenticated: (authentication) => false,
    asHttpHeaders: ({ headers }) => headers
  }
  const authOptions = { token: 't0k3n' }
  const request = {
    method: 'MUTATION',
    params: {
      type: 'account'
    },
    data: [
      { id: 'johnf', type: 'account' },
      { id: 'betty', type: 'account' }
    ],
    endpoint: endpoint.options,
    access: {
      ident: { id: 'johnf' }
    },
    meta: {
      typePlural: 'accounts'
    }
  }
  const expectedRequest = {
    method: 'MUTATION',
    params: {
      type: 'account'
    },
    data: [{ id: 'johnf', type: 'account' }],
    endpoint: endpoint.options,
    access: {
      status: 'partially',
      scheme: 'data',
      ident: { id: 'johnf' }
    },
    auth: { Authorization: 't0k3n' },
    meta: {
      typePlural: 'accounts'
    }
  }

  const ret = await send({
    schemas, mappings, adapter, authenticator, authOptions
  })({ request, endpoint })

  t.deepEqual(ret.request, expectedRequest)
})

test('send should map request data', async (t) => {
  const adapter = createAdapter()
  const endpoint = {
    requestMapper: ({ data }) => ({ data }),
    options: { uri: 'http://some.api/1.0' }
  }
  const authenticator = { id: 'auth1' }
  const request = {
    method: 'MUTATION',
    params: {
      type: 'entry'
    },
    data: [
      { id: 'ent1', type: 'entry', attributes: { title: 'The heading', two: '2' } }
    ],
    endpoint: endpoint.options,
    access: {
      ident: { id: 'johnf' }
    }
  }
  const expectedData = {
    data: {
      items: [{ key: 'ent1', header: 'The heading', two: 2 }]
    }
  }

  const ret = await send({ schemas, mappings, adapter, authenticator })({ request, endpoint })

  t.deepEqual(ret.request.data, expectedData)
})

test('send should retrieve and map data from endpoint', async (t) => {
  const adapter = createAdapter({
    send: async () => ({
      status: 'ok',
      data: { content: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] } }
    })
  })
  const endpoint = {
    responseMapper: (response) => ({ data: response.data.content }),
    options: { uri: 'http://some.api/1.0' }
  }
  const request = {
    method: 'QUERY',
    params: { id: 'ent1', type: 'entry', service: 'thenews' },
    access: { ident: { id: 'johnf' } },
    endpoint: endpoint.options
  }
  const expected = {
    status: 'ok',
    data: [{
      id: 'ent1',
      type: 'entry',
      attributes: { title: 'Entry 1', two: 2 },
      relationships: {
        service: { id: 'thenews', type: 'service' }
      }
    }],
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'data' }
  }

  const ret = await send({ schemas, mappings, adapter })({ request, endpoint })

  t.deepEqual(ret.response, expected)
})

test('send should return authorized response', async (t) => {
  const adapter = createAdapter({
    send: async () => ({
      status: 'ok',
      data: [
        { id: 'johnf', type: 'account' },
        { id: 'betty', type: 'account' }
      ]
    })
  })
  const request = {
    method: 'QUERY',
    params: { type: 'account' },
    auth: { id: 'auth1' },
    access: { ident: { id: 'johnf' } },
    endpoint: endpoint.options
  }
  const expected = {
    status: 'ok',
    data: [
      { id: 'johnf', type: 'account', attributes: {}, relationships: {} }
    ],
    access: {
      status: 'partially',
      scheme: 'data',
      ident: { id: 'johnf' }
    }
  }

  const ret = await send({ schemas, mappings, adapter })({ request, endpoint })

  t.deepEqual(ret.response, expected)
})

test('send should return authorized request data before mapping to service', async (t) => {
  const adapter = createAdapter()
  const request = {
    method: 'MUTATION',
    params: {},
    data: [
      { id: 'johnf', type: 'account' },
      { id: 'betty', type: 'account' }
    ],
    access: { ident: { id: 'johnf' } },
    endpoint: endpoint.options
  }
  const expectedData = [{ id: 'johnf', type: 'account', attributes: {}, relationships: {} }]

  const ret = await send({ schemas, mappings, adapter })({ request, endpoint })

  t.deepEqual(ret.authorizedRequestData, expectedData)
})

test('send should call send with connection', async (t) => {
  const connection = { status: 'ok', value: 'Value from existing connection' }
  const adapter = createAdapter({
    send: async (request, connection = {}) => ({
      status: 'ok',
      data: { items: [{ key: 'ent1', header: connection.value }] }
    })
  })
  const request = {
    method: 'QUERY',
    params: { id: 'ent1', type: 'entry', service: 'thenews' },
    access: { ident: { id: 'johnf' } },
    endpoint: {}
  }
  const expected = {
    status: 'ok',
    data: [{
      id: 'ent1',
      type: 'entry',
      attributes: { title: 'Value from existing connection' },
      relationships: {
        service: { id: 'thenews', type: 'service' }
      }
    }],
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'data' }
  }

  const ret = await send({ schemas, mappings, adapter })({ request, connection })

  t.deepEqual(ret.response, expected)
})

test('send should call connect', async (t) => {
  const adapter = createAdapter({
    connect: async ({ value }) => ({ status: 'ok', value }),
    send: async (request, connection = {}) => ({
      status: 'ok',
      data: { items: [{ key: 'ent1', header: connection.value }] }
    })
  })
  const serviceOptions = { value: 'Value from connection' }
  const request = {
    method: 'QUERY',
    params: { id: 'ent1', type: 'entry', service: 'thenews' },
    access: { ident: { id: 'johnf' } },
    endpoint: {}
  }
  const expected = {
    status: 'ok',
    data: [{
      id: 'ent1',
      type: 'entry',
      attributes: { title: 'Value from connection' },
      relationships: {
        service: { id: 'thenews', type: 'service' }
      }
    }],
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'data' }
  }

  const ret = await send({ schemas, mappings, adapter, serviceOptions })({ request })

  t.deepEqual(ret.response, expected)
})

test('send should retrieve from endpoint with default values', async (t) => {
  const adapter = createAdapter({
    send: async () => ({
      status: 'ok',
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
    })
  })
  const request = {
    method: 'QUERY',
    params: { id: 'ent1', type: 'entry', onlyMappedValues: false },
    access: { ident: { id: 'johnf' } },
    endpoint: endpoint.options
  }

  const ret = await send({ schemas, mappings, adapter })({ request, endpoint })

  const { data } = ret.response
  t.is(data[0].attributes.one, 1)
  t.true(data[0].attributes.createdAt instanceof Date)
  t.true(data[0].attributes.updatedAt instanceof Date)
})

test('send should skip unknown schemas', async (t) => {
  const adapter = createAdapter()
  const request = {
    method: 'MUTATION',
    params: { type: 'account' },
    data: [
      { id: 'un1', type: 'unknown' },
      { id: 'johnf', type: 'account' }
    ],
    access: { ident: { id: 'johnf' } },
    endpoint: endpoint.options
  }

  const ret = await send({ schemas, mappings, adapter })({ request, endpoint })

  t.is(ret.request.data.length, 1)
  t.is(ret.request.data[0].id, 'johnf')
})

test('send should not map response data when unmapped is true', async (t) => {
  const adapter = createAdapter({
    send: async () => ({
      status: 'ok',
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
    })
  })
  const request = {
    method: 'QUERY',
    params: { id: 'ent1', type: 'entry', service: 'thenews', unmapped: true },
    access: { ident: { root: true } },
    endpoint: endpoint.options
  }
  const expected = {
    status: 'ok',
    data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    access: { status: 'granted', ident: { root: true }, scheme: 'unmapped' }
  }

  const ret = await send({ schemas, mappings, adapter })({ request, endpoint })

  t.deepEqual(ret.response, expected)
})

test('should respond with noaction for unknown action type', async (t) => {
  const request = {
    method: 'UNKNOWN',
    params: {}
  }
  const expectedResponse = {
    status: 'noaction'
  }

  const ret = await send({ mappings })({ request })

  t.deepEqual(ret.response, expectedResponse)
})

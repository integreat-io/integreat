import test from 'ava'

import serializeRequest from './serializeRequest'

// Setup

const adapter = {
  serialize: async (request) => ({ ...request, data: JSON.stringify(request.data) })
}

// Tests

test('should serialize request data', async (t) => {
  const request = {
    action: 'SET',
    data: [{ id: 'ent1', type: 'entry' }],
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'], method: 'POST' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }
  const expectedData = '[{"id":"ent1","type":"entry"}]'

  const ret = await serializeRequest({ adapter })({ request })

  t.is(ret.request.data, expectedData)
  t.is(ret.request.action, 'SET')
  t.deepEqual(ret.request.access, request.access)
})

test('should return error when serialize throws', async (t) => {
  const adapter = {
    serialize: async () => { throw new Error('Mistakes!') }
  }
  const request = {
    action: 'GET',
    data: [{ id: 'ent1', type: 'entry' }],
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  const ret = await serializeRequest({ adapter })({ request })

  t.is(ret.response.status, 'error')
  t.regex(ret.response.error, /Mistakes!/)
})

test('should just return when response already set', async (t) => {
  const request = {
    action: 'GET',
    data: [{ id: 'ent1', type: 'entry' }],
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }
  const response = { status: 'error', error: 'Something aweful' }

  const ret = await serializeRequest({ adapter })({ request, response })

  t.deepEqual(ret, {})
})

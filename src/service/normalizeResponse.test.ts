import test from 'ava'

import normalizeResponse from './normalizeResponse'

// Setup

const adapter = {
  normalize: async (request) => ({ ...request, data: JSON.parse(request.data) })
}

// Tests

test('should normalize response data', async (t) => {
  const request = {
    action: 'GET',
    params: { type: 'entry' }
  }
  const response = {
    status: 'ok',
    data: '[{"id":"ent1","type":"entry"}]'
  }
  const expected = {
    status: 'ok',
    data: [{ id: 'ent1', type: 'entry' }]
  }

  const ret = await normalizeResponse({ adapter })({ request, response })

  t.deepEqual(ret, expected)
})

test('should not set response data when no data from service', async (t) => {
  const request = {
    action: 'GET',
    params: { type: 'entry' }
  }
  const response = {
    status: 'ok',
    data: null
  }

  const ret = await normalizeResponse({ adapter })({ request, response })

  t.is(ret.data, null)
})

test('should just return response when no data', async (t) => {
  const request = {
    action: 'GET',
    params: { type: 'entry' }
  }
  const response = { status: 'error', error: 'Something aweful' }

  const ret = await normalizeResponse({ adapter })({ request, response })

  t.deepEqual(ret, response)
})

test('should return error when normalize throws', async (t) => {
  const adapter = {
    normalize: async () => { throw new Error('Mistakes!') }
  }
  const response = { status: 'ok', data: { item: { id: 'ent1', type: 'entry' } } }
  const request = {
    action: 'GET',
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  const ret = await normalizeResponse({ adapter })({ request, response })

  t.is(ret.status, 'error')
  t.regex(ret.error, /Mistakes!/)
})

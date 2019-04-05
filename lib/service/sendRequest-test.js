import test from 'ava'

import sendRequest from './sendRequest'

// Setup

const adapter = {
  send: async () => ({ status: 'ok', data: { item: { id: 'ent1', type: 'entry' } } })
}

// Tests

test('should retrieve from endpoint', async (t) => {
  const request = {
    action: 'GET',
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }
  const expected = {
    status: 'ok',
    data: { item: { id: 'ent1', type: 'entry' } },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  const ret = await sendRequest({ adapter })({ request })

  t.deepEqual(ret, expected)
})

test('should just return response when already set', async (t) => {
  const request = {
    action: 'GET',
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }
  const response = { status: 'error', error: 'Something aweful' }

  const ret = await sendRequest({ adapter })({ request, response })

  t.deepEqual(ret, response)
})

test('should return error from adapter', async (t) => {
  const adapter = {
    send: async () => ({ status: 'notfound', error: 'The entry was not found' })
  }
  const request = {
    action: 'GET',
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent0', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  const ret = await sendRequest({ adapter })({ request })

  t.is(ret.status, 'notfound')
  t.is(ret.error, 'The entry was not found')
})

test('should return error when send throws', async (t) => {
  const adapter = {
    send: async () => { throw new Error('Fail!') }
  }
  const request = {
    action: 'GET',
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  const ret = await sendRequest({ adapter })({ request })

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.regex(ret.error, /Fail!/)
})

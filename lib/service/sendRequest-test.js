import test from 'ava'
import sinon from 'sinon'

import sendRequest from './sendRequest'

// Helpers

const createAdapter = (response) => ({
  send: async () => response,
  normalize: sinon.stub().resolvesArg(0),
  serialize: sinon.stub().callsFake(async (request) => ({ ...request, data: { items: request.data } }))
})

// Tests

test('should retrieve from endpoint', async (t) => {
  const response = { status: 'ok', data: { item: { id: 'ent1', type: 'entry' } } }
  const adapter = createAdapter(response)
  const request = {
    method: 'QUERY',
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }
  const expected = {
    status: 'ok',
    data: { item: { id: 'ent1', type: 'entry' } },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  const ret = await sendRequest(request, { adapter })

  t.deepEqual(ret, expected)
})

test('should call adapter with request', async (t) => {
  const adapter = createAdapter({ status: 'ok' })
  sinon.spy(adapter, 'send')
  const request = {
    method: 'QUERY',
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  await sendRequest(request, { adapter })

  t.is(adapter.send.callCount, 1)
  t.deepEqual(adapter.send.args[0][0], request)
})

test('should call serialize with request', async (t) => {
  const adapter = createAdapter({ status: 'ok' })
  const request = {
    method: 'MUTATION',
    data: [{ id: 'ent1', type: 'entry' }],
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'], method: 'POST' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  await sendRequest(request, { adapter })

  t.is(adapter.serialize.callCount, 1)
  t.deepEqual(adapter.serialize.args[0][0], request)
})

test('should call normalize with response', async (t) => {
  const adapter = createAdapter({ status: 'ok', data: { id: 'ent1', type: 'entry' } })
  const request = {
    method: 'MUTATION',
    data: [{ id: 'ent1', type: 'entry' }],
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'], method: 'POST' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }
  const expected = {
    status: 'ok',
    data: { id: 'ent1', type: 'entry' }
  }

  await sendRequest(request, { adapter })

  t.is(adapter.normalize.callCount, 1)
  t.deepEqual(adapter.normalize.args[0][0], expected)
})

test('should not set response data when no data from service', async (t) => {
  const response = { status: 'ok' }
  const adapter = createAdapter(response)
  const request = {
    method: 'QUERY',
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  const ret = await sendRequest(request, { adapter })

  t.is(typeof ret.data, 'undefined')
})

test('should return error when no endpoint', async (t) => {
  const adapter = createAdapter({ status: 'ok' })
  sinon.spy(adapter, 'send')
  const request = {
    method: 'QUERY',
    params: { type: 'entry', id: 'ent1' },
    access: {}
  }

  const ret = await sendRequest(request, { adapter, serviceId: 'entries' })

  t.is(ret.status, 'error')
  t.is(ret.error, 'No endpoint specified on request to service \'entries\'.')
  t.is(adapter.send.callCount, 0)
})

test('should return noaccess when request is refused', async (t) => {
  const response = { status: 'ok', data: { item: { id: 'ent1', type: 'entry' } } }
  const adapter = createAdapter(response)
  const request = {
    method: 'QUERY',
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'refused', ident: null, scheme: 'auth' }
  }

  const ret = await sendRequest(request, { adapter })

  t.is(ret.status, 'noaccess', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return error from adapter', async (t) => {
  const response = { status: 'notfound', error: 'The entry was not found' }
  const adapter = createAdapter(response)
  const request = {
    method: 'QUERY',
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent0', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  const ret = await sendRequest(request, { adapter })

  t.is(ret.status, 'notfound')
  t.is(ret.error, 'The entry was not found')
})

test('should return error when send throws', async (t) => {
  const adapter = createAdapter({})
  adapter.send = async () => Promise.reject(new Error('Fail!'))
  const request = {
    method: 'QUERY',
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  await t.notThrows(async () => {
    const ret = await sendRequest(request, { adapter })

    t.truthy(ret)
    t.is(ret.status, 'error')
    t.regex(ret.error, /Fail!/)
  })
})

test('should return error when normalize throws', async (t) => {
  const response = { status: 'ok', data: { item: { id: 'ent1', type: 'entry' } } }
  const adapter = createAdapter(response)
  adapter.normalize = async () => Promise.reject(new Error('Mistakes!'))
  const request = {
    method: 'QUERY',
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  await t.notThrows(async () => {
    const ret = await sendRequest(request, { adapter })

    t.is(ret.status, 'error')
    t.regex(ret.error, /Mistakes!/)
  })
})

test('should return error when serialize throws', async (t) => {
  const response = { status: 'ok', data: { item: { id: 'ent1', type: 'entry' } } }
  const adapter = createAdapter(response)
  adapter.serialize = async () => Promise.reject(new Error('Mistakes!'))
  const request = {
    method: 'QUERY',
    data: [{ id: 'ent1', type: 'entry' }],
    endpoint: { uri: ['http://some.api/1.0'], path: ['item'] },
    params: { id: 'ent1', type: 'entry' },
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  await t.notThrows(async () => {
    const ret = await sendRequest(request, { adapter })

    t.is(ret.status, 'error')
    t.regex(ret.error, /Mistakes!/)
  })
})

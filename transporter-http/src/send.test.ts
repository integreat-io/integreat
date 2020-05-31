import test from 'ava'
import nock = require('nock')
import transporter from './transporter'
import { Exchange } from '../../core/src'

import send from './send'

// Setup

const createEndpoint = (options: Record<string, unknown>) => ({
  options: transporter.prepareOptions(options),
  mutateRequest: (exchange: Exchange) => exchange,
  mutateResponse: (exchange: Exchange) => exchange,
  isMatch: () => false,
})

test.after.always(() => {
  nock.restore()
})

// Tests

test('should send data and return status and data', async (t) => {
  const data = '{"id":"ent1","title":"Entry 1"}'
  const scope = nock('http://json1.test', {
    reqheaders: { 'Content-Type': 'text/plain' },
  })
    .put('/entries/ent1', data)
    .reply(200, { id: 'ent1' })
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data },
    response: {},
    meta: {},
    endpoint: createEndpoint({ uri: 'http://json1.test/entries/ent1' }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.response.data, '{"id":"ent1"}')
  t.true(scope.isDone())
})

test('should use GET method as default when no data', async (t) => {
  const scope = nock('http://json2.test', { badheaders: ['Content-Type'] })
    .get('/entries/ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
  const exchange = {
    type: 'GET',
    status: null,
    request: { type: 'entry' },
    response: {},
    meta: {},
    endpoint: createEndpoint({ uri: 'http://json2.test/entries/ent1' }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.response.data, '{"id":"ent1","type":"entry"}')
  t.true(scope.isDone())
})

test('should convert all non-string data to JSON', async (t) => {
  const data = { id: 'ent1', title: 'Entry 1' }
  const scope = nock('http://json18.test', {
    reqheaders: { 'Content-Type': 'application/json' },
  })
    .put('/entries/ent1', JSON.stringify(data))
    .reply(200, { id: 'ent1' })
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data },
    response: {},
    meta: {},
    endpoint: createEndpoint({ uri: 'http://json18.test/entries/ent1' }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.response.data, '{"id":"ent1"}')
  t.true(scope.isDone())
})

test('should use method from endpoint', async (t) => {
  const data = '{"id":"ent1","title":"Entry 1"}'
  const scope = nock('http://json3.test')
    .post('/entries/ent1', data)
    .reply(200, { id: 'ent1' })
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data },
    response: {},
    meta: {},
    endpoint: createEndpoint({
      uri: 'http://json3.test/entries/ent1',
      method: 'POST' as const,
    }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test('should support base url', async (t) => {
  const scope = nock('http://json19.test', {
    reqheaders: { 'Content-Type': 'text/plain' },
  })
    .put('/entries/ent1')
    .reply(200, { id: 'ent1' })
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data: '{"id":"ent1","title":"Entry 1"}' },
    response: {},
    meta: {},
    endpoint: createEndpoint({
      baseUri: 'http://json19.test/',
      uri: '/entries/ent1',
    }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test('should return ok status on all 200-range statuses', async (t) => {
  const data = '{"id":"ent2","title":"Entry 2"}'
  const scope = nock('http://json4.test')
    .put('/entries/ent2', data)
    .reply(202, { id: 'ent2' })
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data },
    response: {},
    meta: {},
    endpoint: createEndpoint({ uri: 'http://json4.test/entries/ent2' }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test('should return error on not found', async (t) => {
  nock('http://json5.test').get('/entries/unknown').reply(404)
  const exchange = {
    type: 'GET',
    status: null,
    request: { type: 'entry' },
    response: {},
    meta: {},
    endpoint: createEndpoint({ uri: 'http://json5.test/entries/unknown' }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'notfound', ret.response.error)
  t.is(
    ret.response.error,
    'Could not find the url http://json5.test/entries/unknown'
  )
  t.is(ret.response.data, undefined)
})

test('should return error on other error', async (t) => {
  nock('http://json6.test').get('/entries/error').reply(500)
  const exchange = {
    type: 'GET',
    status: null,
    request: { type: 'entry' },
    response: {},
    meta: {},
    endpoint: createEndpoint({ uri: 'http://json6.test/entries/error' }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'error', ret.response.error)
  t.is(
    ret.response.error,
    'Server returned 500 for http://json6.test/entries/error'
  )
  t.is(ret.response.data, undefined)
})

test('should return error on request error', async (t) => {
  nock('http://json7.test')
    .get('/entries/ent1')
    .replyWithError('An awful error')
  const exchange = {
    type: 'GET',
    status: null,
    request: { type: 'entry' },
    response: {},
    meta: {},
    endpoint: createEndpoint({ uri: 'http://json7.test/entries/ent1' }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'error', ret.response.error)
})

test('should respond with badrequest on 400', async (t) => {
  nock('http://json8.test').put('/entries/ent1', '{}').reply(400, {})
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data: '{}' },
    response: {},
    auth: {},
    meta: {},
    endpoint: createEndpoint({ uri: 'http://json8.test/entries/ent1' }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'badrequest', ret.response.error)
  t.is(typeof ret.response.error, 'string')
})

test('should respond with timeout on 408', async (t) => {
  nock('http://json9.test').put('/entries/ent1', '{}').reply(408, {})
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data: '{}' },
    response: {},
    auth: {},
    meta: {},
    endpoint: createEndpoint({ uri: 'http://json9.test/entries/ent1' }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'timeout', ret.response.error)
  t.is(typeof ret.response.error, 'string')
})

test('should reject on 401 with auth', async (t) => {
  nock('http://json10.test').put('/entries/ent1', '{}').reply(401, {})
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data: '{}' },
    response: {},
    auth: {},
    meta: {},
    endpoint: createEndpoint({ uri: 'http://json10.test/entries/ent1' }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'noaccess', ret.response.error)
  t.is(typeof ret.response.error, 'string')
})

test('should reject on 401 without auth', async (t) => {
  nock('http://json11.test').put('/entries/ent1', '{}').reply(401, {})
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data: '{}' },
    response: {},
    meta: {},
    auth: null,
    endpoint: createEndpoint({ uri: 'http://json11.test/entries/ent1' }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'noaccess', ret.response.error)
  t.is(typeof ret.response.error, 'string')
})

test('should reject on 403 ', async (t) => {
  nock('http://json12.test').put('/entries/ent1', '{}').reply(403, {})
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data: '{}' },
    response: {},
    meta: {},
    auth: null,
    endpoint: createEndpoint({ uri: 'http://json12.test/entries/ent1' }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'noaccess', ret.response.error)
  t.is(typeof ret.response.error, 'string')
})

test('should send with headers from endpoint', async (t) => {
  nock('http://json13.test', {
    reqheaders: {
      authorization: 'The_token',
      'If-Match': '3-871801934',
    },
  })
    .put('/entries/ent1', '{}')
    .reply(200)
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data: '{}' },
    response: {},
    meta: {},
    endpoint: createEndpoint({
      headers: { 'If-Match': '3-871801934' },
      uri: 'http://json13.test/entries/ent1',
    }),
    auth: { Authorization: 'The_token' },
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'ok', ret.response.error)
})

test('should retrieve with auth headers', async (t) => {
  nock('http://json14.test', {
    reqheaders: {
      authorization: 'The_token',
    },
  })
    .put('/entries/ent1', '{}')
    .reply(200)
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data: '{}' },
    response: {},
    meta: {},
    endpoint: createEndpoint({ uri: 'http://json14.test/entries/ent1' }),
    auth: { Authorization: 'The_token' },
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'ok', ret.response.error)
})

test('should retrieve with headers from exchange', async (t) => {
  nock('http://json15.test', {
    reqheaders: {
      authorization: 'The_token',
      'If-Match': '3-871801934',
      'x-correlation-id': '1234567890',
      'content-type': 'text/xml;charset=utf-8',
    },
  })
    .put(
      '/entries/ent1',
      '<?xml version="1.0" encoding="utf-8"?><soap:Envelope></soap:Envelope>'
    )
    .reply(200)
  const exchange = {
    type: 'SET',
    status: null,
    request: {
      type: 'entry',
      data:
        '<?xml version="1.0" encoding="utf-8"?><soap:Envelope></soap:Envelope>',
      headers: {
        'x-correlation-id': '1234567890',
        'Content-Type': 'text/xml;charset=utf-8',
      },
    },
    response: {},
    meta: {},
    endpoint: createEndpoint({
      headers: { 'If-Match': '3-871801934' },
      uri: 'http://json15.test/entries/ent1',
    }),
    auth: { Authorization: 'The_token' },
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'ok', ret.response.error)
})

test('should retrieve with auth params in querystring', async (t) => {
  nock('http://json16.test')
    .put('/entries/ent1', '{}')
    .query({ authorization: 'Th@&t0k3n', timestamp: '1554407539' })
    .reply(200)
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data: '{}' },
    response: {},
    meta: {},
    endpoint: createEndpoint({
      uri: 'http://json16.test/entries/ent1',
      authAsQuery: true,
    }),
    auth: { Authorization: 'Th@&t0k3n', timestamp: '1554407539' },
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'ok', ret.response.error)
})

test('should retrieve with auth params in querystring when uri has querystring', async (t) => {
  nock('http://json17.test')
    .put('/entries/ent1', '{}')
    .query({ page: 1, authorization: 'Th@&t0k3n', timestamp: '1554407539' })
    .reply(200)
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data: '{}' },
    response: {},
    meta: {},
    endpoint: createEndpoint({
      uri: 'http://json17.test/entries/ent1?page=1',
      authAsQuery: true,
    }),
    auth: { Authorization: 'Th@&t0k3n', timestamp: '1554407539' },
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'ok', ret.response.error)
})

test('should not throw when auth=true', async (t) => {
  nock('http://json11.test').put('/entries/ent3', {}).reply(200)
  const exchange = {
    type: 'SET',
    status: null,
    request: { type: 'entry', data: '{}' },
    response: {},
    meta: {},
    endpoint: createEndpoint({
      uri: 'http://json11.test/entries/ent3',
    }),
    auth: true,
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'ok', ret.response.error)
})

test('should return error when no endpoint', async (t) => {
  const exchange = {
    type: 'GET',
    status: null,
    request: { type: 'entry' },
    response: {},
    meta: {},
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'badrequest', ret.response.error)
})

test('should return error when no uri', async (t) => {
  const exchange = {
    type: 'GET',
    status: null,
    request: { type: 'entry' },
    response: {},
    meta: {},
    endpoint: createEndpoint({ uri: undefined }),
  }

  const ret = await send(exchange, null)

  t.is(ret.status, 'badrequest', ret.response.error)
})

test.todo('should retry')

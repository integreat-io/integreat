import test from 'ava'
import nock from 'nock'

import { send, prepareEndpoint } from '.'

// Setup

test.after((t) => {
  nock.restore()
})

// Tests

test('should send data and return status', async (t) => {
  const data = { id: 'ent1', title: 'Entry 1' }
  const scope = nock('http://json1.test')
    .put('/entries/ent1', data)
    .reply(200, { id: 'ent1' })
  const request = { endpoint: prepareEndpoint({ uri: 'http://json1.test/entries/ent1' }), data }

  const ret = await send(request)

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, { id: 'ent1' })
  t.true(scope.isDone())
})

test('should use GET method as default when no data', async (t) => {
  const scope = nock('http://json14.test')
    .get('/entries/ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
  const request = { endpoint: prepareEndpoint({ uri: 'http://json14.test/entries/ent1' }) }

  const ret = await send(request)

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, { id: 'ent1', type: 'entry' })
  t.true(scope.isDone())
})

test('should send data and return status with endpoint prop', async (t) => {
  const data = { id: 'ent1', title: 'Entry 1' }
  const scope = nock('http://json12.test')
    .put('/entries/ent1', data)
    .reply(200, { id: 'ent1' })
  const endpoint = prepareEndpoint({
    uri: 'http://json12.test/entries/{id}',
    method: 'PUT'
  })
  const request = { endpoint, data, params: { id: 'ent1', type: 'entry' } }

  const ret = await send(request)

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, { id: 'ent1' })
})

test('should return request props on dry-run', async (t) => {
  const data = { id: 'ent1', title: 'Entry 1' }
  const endpoint = prepareEndpoint({
    uri: 'http://json12.test/entries/{id}',
    method: 'PUT'
  })
  const request = { endpoint, data, params: { id: 'ent1', type: 'entry', dryrun: true } }
  const expectedData = {
    uri: 'http://json12.test/entries/ent1',
    method: 'PUT',
    body: JSON.stringify(data),
    headers: {}
  }

  const ret = await send(request)

  t.is(ret.status, 'dryrun')
  t.deepEqual(ret.data, expectedData)
})

test('should generate uri with params', async (t) => {
  const data = { id: 'ent1', title: 'Entry 1' }
  const scope = nock('http://json13.test')
    .put('/entries/ent1', data)
    .reply(200, { id: 'ent1' })
  const endpoint = prepareEndpoint({
    uri: 'http://json13.test/{folder}/{id}',
    method: 'PUT'
  })
  const request = { endpoint, data, params: { folder: 'entries', id: 'ent1', type: 'entry' } }

  await send(request)

  t.true(scope.isDone())
})

test('should return error when no uri or endpoint', async (t) => {
  const request = {}

  const ret = await send(request)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return ok status on all 200-range statuses', async (t) => {
  const data = { id: 'ent2', title: 'Entry 2' }
  const scope = nock('http://json1.test')
    .put('/entries/ent2', data)
    .reply(202, { id: 'ent2' })
  const request = { endpoint: prepareEndpoint({ uri: 'http://json1.test/entries/ent2' }), data }

  const ret = await send(request)

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, { id: 'ent2' })
})

test('should return error on not found', async (t) => {
  nock('http://json2.test')
    .put('/entries/unknown', {})
    .reply(404)
  const request = { endpoint: prepareEndpoint({ uri: 'http://json2.test/entries/unknown' }), data: {} }

  const ret = await send(request)

  t.is(ret.status, 'notfound')
  t.is(ret.error, 'Could not find the url http://json2.test/entries/unknown')
  t.is(ret.data, undefined)
})

test('should return error on other error', async (t) => {
  nock('http://json2.test')
    .put('/entries/forbidden', {})
    .reply(403)
  const request = { endpoint: prepareEndpoint({ uri: 'http://json2.test/entries/forbidden' }), data: {} }

  const ret = await send(request)

  t.is(ret.status, 'error')
  t.is(ret.error, 'Server returned 403 for http://json2.test/entries/forbidden')
  t.is(ret.data, undefined)
})

test('should return error on request error', async (t) => {
  nock('http://json3.test')
    .put('/entries/ent1', {})
    .replyWithError('An awful error')
  const request = { endpoint: prepareEndpoint({ uri: 'http://json3.test/entries/ent1' }), data: {} }

  const ret = await send(request)

  t.is(ret.status, 'error')
})

test('should retrieve with auth headers', async (t) => {
  nock('http://json7.test', {
    reqheaders: {
      'authorization': 'The_token'
    }
  })
    .put('/entries/ent1', {})
    .reply(200)
  const auth = { Authorization: 'The_token' }
  const request = { endpoint: prepareEndpoint({ uri: 'http://json7.test/entries/ent1' }), data: {}, auth }

  const ret = await send(request)

  t.is(ret.status, 'ok')
})

test('should not throw when auth=true', async (t) => {
  nock('http://json1.test')
    .put('/entries/ent3', {})
    .reply(200)
  const auth = true
  const request = { endpoint: prepareEndpoint({ uri: 'http://json1.test/entries/ent3' }), data: {}, auth }

  const ret = await send(request)

  t.is(ret.status, 'ok')
})

test('should retrieve with headers from endpoint', async (t) => {
  nock('http://json7.test', {
    reqheaders: {
      'authorization': 'The_token',
      'If-Match': '3-871801934'
    }
  })
    .put('/entries/ent1', {})
    .reply(200)
  const auth = { Authorization: 'The_token' }
  const request = {
    endpoint: prepareEndpoint({
      headers: { 'If-Match': '3-871801934' },
      uri: 'http://json7.test/entries/ent1'
    }),
    data: {},
    auth
  }

  const ret = await send(request)

  t.is(ret.status, 'ok')
})

test('should reject on 401 with auth', async (t) => {
  nock('http://json9.test')
    .put('/entries/ent1', {})
    .reply(401, {})
  const auth = {}
  const request = { endpoint: prepareEndpoint({ uri: 'http://json9.test/entries/ent1' }), data: {}, auth }

  const ret = await send(request)

  t.is(ret.status, 'noaccess')
})

test('should reject on 401 without auth', async (t) => {
  nock('http://json10.test')
    .put('/entries/ent1', {})
    .reply(401, {})
  const auth = null
  const request = { endpoint: prepareEndpoint({ uri: 'http://json10.test/entries/ent1' }), data: {}, auth }

  const ret = await send(request)

  t.is(ret.status, 'noaccess')
})

import test from 'ava'
import nock from 'nock'
import sinon from 'sinon'

import {send, prepareEndpoint} from '.'

test.after((t) => {
  nock.restore()
})

test('should exist', (t) => {
  t.is(typeof send, 'function')
})

test('should send data and return status', async (t) => {
  const data = {id: 'ent1', title: 'Entry 1'}
  const scope = nock('http://json1.test')
    .put('/entries/ent1', data)
    .reply(200, {id: 'ent1'})
  const request = {uri: 'http://json1.test/entries/ent1', data}

  const ret = await send(request)

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {id: 'ent1'})
  t.true(scope.isDone())
})

test('should use GET method as default when no data', async (t) => {
  const scope = nock('http://json14.test')
    .get('/entries/ent1')
    .reply(200, {id: 'ent1', type: 'entry'})
  const request = {uri: 'http://json14.test/entries/ent1'}

  const ret = await send(request)

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {id: 'ent1', type: 'entry'})
  t.true(scope.isDone())
})

test('should send data and return status with endpoint prop', async (t) => {
  const data = {id: 'ent1', title: 'Entry 1'}
  const scope = nock('http://json12.test')
    .put('/entries/ent1', data)
    .reply(200, {id: 'ent1'})
  const endpoint = prepareEndpoint({
    uri: 'http://json12.test/entries/{id}',
    method: 'PUT'
  })
  const request = {endpoint, data, params: {id: 'ent1', type: 'entry'}}

  const ret = await send(request)

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {id: 'ent1'})
})

test('should generate uri with params', async (t) => {
  const data = {id: 'ent1', title: 'Entry 1'}
  const scope = nock('http://json13.test')
    .put('/entries/ent1', data)
    .reply(200, {id: 'ent1'})
  const endpoint = prepareEndpoint({
    uri: 'http://json13.test/{folder}/{id}',
    method: 'PUT'
  })
  const request = {endpoint, data, params: {folder: 'entries', id: 'ent1', type: 'entry'}}

  await send(request)

  t.true(scope.isDone())
})

test('should add body properties from endpoint', async (t) => {
  const scope = nock('http://json15.test')
    .post('/entries', {keys: ['ent1']})
    .reply(200, [{id: 'ent1', type: 'entry'}])
  const endpoint = prepareEndpoint({
    uri: 'http://json15.test/entries',
    body: [{path: 'keys', param: 'id'}]
  })
  const request = {endpoint, params: {id: ['ent1']}, method: 'POST'}

  const ret = await send(request)

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, [{id: 'ent1', type: 'entry'}])
  t.true(scope.isDone())
})

test('should return error when no uri or endpoint', async (t) => {
  const request = {}

  const ret = await send(request)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return ok status on all 200-range statuses', async (t) => {
  const data = {id: 'ent2', title: 'Entry 2'}
  const scope = nock('http://json1.test')
    .put('/entries/ent2', data)
    .reply(202, {id: 'ent2'})
  const request = {uri: 'http://json1.test/entries/ent2', data}

  const ret = await send(request)

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {id: 'ent2'})
})

test('should return error on not found', async (t) => {
  nock('http://json2.test')
    .put('/entries/unknown', {})
    .reply(404)
  const request = {uri: 'http://json2.test/entries/unknown', data: {}}

  const ret = await send(request)

  t.is(ret.status, 'notfound')
  t.is(ret.error, 'Could not find the url http://json2.test/entries/unknown')
  t.is(ret.data, undefined)
})

test('should return error on other error', async (t) => {
  nock('http://json2.test')
    .put('/entries/timeout', {})
    .reply(408)
  const request = {uri: 'http://json2.test/entries/timeout', data: {}}

  const ret = await send(request)

  t.is(ret.status, 'error')
  t.is(ret.error, 'Server returned 408 for http://json2.test/entries/timeout')
  t.is(ret.data, undefined)
})

test('should return error on request error', async (t) => {
  nock('http://json3.test')
    .put('/entries/ent1', {})
    .replyWithError('An awful error')
  const request = {uri: 'http://json3.test/entries/ent1', data: {}}

  const ret = await send(request)

  t.is(ret.status, 'error')
})

test('should reject when authentication fails', async (t) => {
  const auth = {
    isAuthenticated: () => false,
    authenticate: async () => false
  }
  const req = nock('http://json4.test')
    .put('/entries/ent1', {})
    .reply(200)
  const request = {uri: 'http://json4.test/entries/ent1', data: {}, auth}

  const ret = await send(request)

  t.is(ret.status, 'autherror')
  t.false(req.isDone())
})

test('should retrieve when authentication is successful', async (t) => {
  const auth = {
    isAuthenticated: () => false,
    authenticate: async () => true
  }
  nock('http://json5.test')
    .put('/entries/ent1', {})
    .reply(200)
  const request = {uri: 'http://json5.test/entries/ent1', data: {}, auth}

  const ret = await send(request)

  t.is(ret.status, 'ok')
})

test('should retrieve when already authenticated', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    authenticate: async () => false
  }
  nock('http://json6.test')
    .put('/entries/ent1', {})
    .reply(200)
  const request = {uri: 'http://json6.test/entries/ent1', data: {}, auth}

  const ret = await send(request)

  t.is(ret.status, 'ok')
})

test('should retrieve with auth headers', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    getAuthHeaders: () => ({Authorization: 'The_token'})
  }

  nock('http://json7.test', {
    reqheaders: {
      'authorization': 'The_token'
    }
  })
    .put('/entries/ent1', {})
    .reply(200)
  const request = {uri: 'http://json7.test/entries/ent1', data: {}, auth}

  const ret = await send(request)

  t.is(ret.status, 'ok')
})

test('should retrieve with given headers', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    getAuthHeaders: () => ({Authorization: 'The_token'})
  }

  nock('http://json7.test', {
    reqheaders: {
      'authorization': 'The_token',
      'If-Match': '3-871801934'
    }
  })
    .put('/entries/ent1', {})
    .reply(200)
  const request = {
    uri: 'http://json7.test/entries/ent1',
    data: {},
    headers: {'If-Match': '3-871801934'},
    auth
  }

  const ret = await send(request)

  t.is(ret.status, 'ok')
})

test('should authenticate when request returns 401', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    authenticate: sinon.stub().resolves(true)
  }
  const req = nock('http://json8.test')
    .put('/entries/ent1', {})
    .reply(401, {})
    .put('/entries/ent1', {})
    .reply(200)
  const request = {uri: 'http://json8.test/entries/ent1', data: {}, auth}

  const ret = await send(request)

  t.is(auth.authenticate.callCount, 1)
  t.true(req.isDone())
  t.is(ret.status, 'ok')
})

test('should reject when authentication after 401 fails', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    authenticate: sinon.stub().resolves(false)
  }
  nock('http://json9.test')
    .put('/entries/ent1', {})
    .reply(401, {})
  const request = {uri: 'http://json9.test/entries/ent1', data: {}, auth}

  const ret = await send(request)

  t.is(auth.authenticate.callCount, 1)
  t.is(ret.status, 'autherror')
})

test('should authenticate only once when request returns 401', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    authenticate: sinon.stub().resolves(true)
  }
  const req = nock('http://json10.test')
    .put('/entries/ent1', {})
    .reply(401, {})
    .put('/entries/ent1', {})
    .reply(401, {})
  const request = {uri: 'http://json10.test/entries/ent1', data: {}, auth}

  const ret = await send(request)

  t.is(auth.authenticate.callCount, 1)
  t.true(req.isDone())
  t.is(ret.status, 'noaccess')
})

test('should not authenticate on 401 when no auth', async (t) => {
  const auth = null
  nock('http://json11.test')
    .put('/entries/ent1', {})
    .reply(401, {})
  const request = {uri: 'http://json11.test/entries/ent1', data: {}, auth}

  const ret = await send(request)

  t.is(ret.status, 'noaccess')
})

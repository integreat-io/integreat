import test from 'ava'
import nock from 'nock'
import sinon from 'sinon'

import {send} from '.'

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

  const ret = await send('http://json1.test/entries/ent1', data)

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {id: 'ent1'})
})

test('should return ok status on all 200-range statuses', async (t) => {
  const data = {id: 'ent2', title: 'Entry 2'}
  const scope = nock('http://json1.test')
    .put('/entries/ent2', data)
    .reply(202, {id: 'ent2'})

  const ret = await send('http://json1.test/entries/ent2', data)

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {id: 'ent2'})
})

test('should return error on not found', async (t) => {
  nock('http://json2.test')
    .put('/entries/unknown', {})
    .reply(404)

  const ret = await send('http://json2.test/entries/unknown', {})

  t.is(ret.status, 'notfound')
  t.is(ret.error, 'Could not find the url http://json2.test/entries/unknown')
  t.is(ret.data, undefined)
})

test('should return error on other error', async (t) => {
  nock('http://json2.test')
    .put('/entries/timeout', {})
    .reply(408)

  const ret = await send('http://json2.test/entries/timeout', {})

  t.is(ret.status, 'error')
  t.is(ret.error, 'Server returned 408 for http://json2.test/entries/timeout')
  t.is(ret.data, undefined)
})

test('should return error on request error', async (t) => {
  nock('http://json3.test')
    .put('/entries/ent1', {})
    .replyWithError('An awful error')

  const ret = await send('http://json3.test/entries/ent1', {})

  t.is(ret.status, 'error')
  t.regex(ret.error, /An\sawful\serror/)
})

test('should reject when authentication fails', async (t) => {
  const auth = {
    isAuthenticated: () => false,
    authenticate: () => Promise.resolve(false)
  }
  const req = nock('http://json4.test')
    .put('/entries/ent1', {})
    .reply(200)

  const ret = await send('http://json4.test/entries/ent1', {}, auth)

  t.is(ret.status, 'autherror')
  t.regex(ret.error, /Could\s+not\s+authenticate/)
  t.false(req.isDone())
})

test('should retrieve when authentication is successful', async (t) => {
  const auth = {
    isAuthenticated: () => false,
    authenticate: () => Promise.resolve(true)
  }
  nock('http://json5.test')
    .put('/entries/ent1', {})
    .reply(200)

  const ret = await send('http://json5.test/entries/ent1', {}, auth)

  t.is(ret.status, 'ok')
})

test('should retrieve when already authenticated', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    authenticate: () => Promise.resolve(false)
  }
  nock('http://json6.test')
    .put('/entries/ent1', {})
    .reply(200)

  const ret = await send('http://json6.test/entries/ent1', {}, auth)

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

  const ret = await send('http://json7.test/entries/ent1', {}, auth)

  t.is(ret.status, 'ok')
})

test('should authenticate when request returns 401', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    authenticate: sinon.stub().returns(Promise.resolve(true))
  }
  const req = nock('http://json8.test')
    .put('/entries/ent1', {})
    .reply(401, {})
    .put('/entries/ent1', {})
    .reply(200)

  const ret = await send('http://json8.test/entries/ent1', {}, auth)

  t.is(auth.authenticate.callCount, 1)
  t.true(req.isDone())
  t.is(ret.status, 'ok')
})

test('should authenticate only once when request returns 401', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    authenticate: sinon.stub().returns(Promise.resolve(true))
  }
  const req = nock('http://json9.test')
    .put('/entries/ent1', {})
    .reply(401, {})
    .put('/entries/ent1', {})
    .reply(401, {})

  const ret = await send('http://json9.test/entries/ent1', {}, auth)

  t.is(auth.authenticate.callCount, 1)
  t.true(req.isDone())
  t.is(ret.status, 'autherror')
})

test('should not authenticate on 401 when no auth', async (t) => {
  const auth = null
  nock('http://json9.test')
    .put('/entries/ent1', {})
    .reply(401, {})

  await t.notThrows(async () => {
    const ret = await send('http://json9.test/entries/ent1', {}, auth)

    t.is(ret.status, 'autherror')
  })
})

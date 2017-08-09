import test from 'ava'
import nock from 'nock'
import sinon from 'sinon'

import {retrieve} from '.'

test.after((t) => {
  nock.restore()
})

test('should exist', (t) => {
  t.is(typeof retrieve, 'function')
})

test('should return json object', async (t) => {
  const data = {data: [
    {id: 'item1'},
    {id: 'item2'}
  ]}
  nock('http://test.site')
    .get('/items')
    .reply(200, data)

  const ret = await retrieve('http://test.site/items')

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, data)
})

test('should return ok status on all 200-range statuses', async (t) => {
  const data = {data: []}
  nock('http://test.site')
    .get('/partial')
    .reply(206, data)

  const ret = await retrieve('http://test.site/partial')

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, data)
})

test('should return error with status notfound', async (t) => {
  nock('http://test.site')
    .get('/unknown')
    .reply(404)

  const ret = await retrieve('http://test.site/unknown')

  t.is(ret.status, 'notfound')
  t.is(ret.error, 'Could not find the url http://test.site/unknown')
  t.is(ret.data, undefined)
})

test('should return error on other error', async (t) => {
  nock('http://test.site')
    .get('/timeout')
    .reply(408)

  const ret = await retrieve('http://test.site/timeout')

  t.is(ret.status, 'error')
  t.is(ret.error, 'Server returned 408 for http://test.site/timeout')
  t.is(ret.data, undefined)
})

test('should return error on request error', async (t) => {
  t.plan(2)
  nock('http://test.site')
    .get('/error')
    .replyWithError('An awful error')

  const ret = await retrieve('http://test.site/error')

  t.is(ret.status, 'error')
  t.regex(ret.error, /An\sawful\serror/)
})

test('should return error with autherror', async (t) => {
  t.plan(3)
  const auth = {
    isAuthenticated: () => false,
    authenticate: () => Promise.resolve(false)
  }
  const req = nock('http://test.site')
    .get('/authfailed')
    .reply(200, {data: []})

  const ret = await retrieve('http://test.site/authfailed', auth)

  t.is(ret.status, 'autherror')
  t.regex(ret.error, /Could\s+not\s+authenticate/)
  t.false(req.isDone())
})

test('should retrieve when authentication is successful', async (t) => {
  const auth = {
    isAuthenticated: () => false,
    authenticate: () => Promise.resolve(true)
  }
  nock('http://test.site')
    .get('/authsuccess')
    .reply(200, {data: []})

  const ret = await retrieve('http://test.site/authsuccess', auth)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {data: []})
})

test('should retrieve when already authenticated', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    authenticate: () => Promise.resolve(false)
  }
  nock('http://test.site')
    .get('/authsuccess')
    .reply(200, {data: []})

  const ret = await retrieve('http://test.site/authsuccess', auth)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {data: []})
})

test('should retrieve with auth headers', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    getAuthHeaders: () => ({Authorization: 'The_token'})
  }
  nock('http://test.site', {
    reqheaders: {
      'authorization': 'The_token'
    }
  })
    .get('/authorize')
    .reply(200, {data: []})

  const ret = await retrieve('http://test.site/authorize', auth)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {data: []})
})

test('should authenticate when request returns 401', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    authenticate: sinon.stub().returns(Promise.resolve(true))
  }
  const req = nock('http://test.site')
    .get('/reauth')
    .reply(401, {})
    .get('/reauth')
    .reply(200, {data: []})

  const ret = await retrieve('http://test.site/reauth', auth)

  t.is(auth.authenticate.callCount, 1)
  t.true(req.isDone())
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {data: []})
})

test('should authenticate only once when request returns 401', async (t) => {
  const auth = {
    isAuthenticated: () => true,
    authenticate: sinon.stub().returns(Promise.resolve(true))
  }
  const req = nock('http://test.site')
    .get('/rereauth')
    .reply(401, {})
    .get('/rereauth')
    .reply(401, {})

  const ret = await retrieve('http://test.site/rereauth', auth)

  t.is(auth.authenticate.callCount, 1)
  t.true(req.isDone())
  t.is(ret.status, 'autherror')
})

test('should not authenticate on 401 when no auth', async (t) => {
  const auth = null
  nock('http://test.site')
    .get('/rereauth')
    .reply(401, {})

  await t.notThrows(async () => {
    const ret = await retrieve('http://test.site/rereauth', auth)

    t.is(ret.status, 'autherror')
  })
})

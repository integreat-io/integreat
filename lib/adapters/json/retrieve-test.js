import test from 'ava'
import nock from 'nock'

import retrieve from './retrieve'

test('should exist', (t) => {
  t.is(typeof retrieve, 'function')
})

test('should return json object', async (t) => {
  const json = {data: [
    {id: 'item1'},
    {id: 'item2'}
  ]}
  nock('http://test.site')
    .get('/items')
    .reply(200, json)

  const ret = await retrieve('http://test.site/items')

  t.deepEqual(ret, json)

  nock.restore()
})

test('should reject with error message on 404', async (t) => {
  t.plan(2)
  nock('http://test.site')
    .get('/unknown')
    .reply(404)

  try {
    await retrieve('http://test.site/unknown')
  } catch (err) {
    t.true(err instanceof Error)
    t.regex(err.message, /\s404.+http:\/\/test\.site\/unknown/)
  }
})

test('should reject with error message on other error', async (t) => {
  t.plan(2)
  nock('http://test.site')
    .get('/error')
    .replyWithError('An awful error')

  try {
    await retrieve('http://test.site/error')
  } catch (err) {
    t.true(err instanceof Error)
    t.regex(err.message, /An\sawful\serror/)
  }
})

test('should reject when authentication fails', async (t) => {
  t.plan(3)
  const auth = {
    isAuthenticated: () => false,
    authenticate: () => Promise.resolve(false)
  }
  const req = nock('http://test.site')
    .get('/authfailed')
    .reply(200, {data: []})

  try {
    await retrieve('http://test.site/authfailed', auth)
  } catch (err) {
    t.true(err instanceof Error)
    t.regex(err.message, /Could\s+not\s+authenticate/)
    t.false(req.isDone())
  }
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

  t.deepEqual(ret, {data: []})
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

  t.deepEqual(ret, {data: []})
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

  t.deepEqual(ret, {data: []})
})

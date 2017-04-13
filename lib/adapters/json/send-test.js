import test from 'ava'
import nock from 'nock'

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
  t.is(ret.status, 200)
  t.deepEqual(ret.data, {id: 'ent1'})
})

test('should reject with error message on 404', async (t) => {
  t.plan(2)
  nock('http://json2.test')
    .put('/entries/unknown', {})
    .reply(404)

  try {
    await send('http://json2.test/entries/unknown', {})
  } catch (err) {
    t.true(err instanceof Error)
    t.regex(err.message, /\s404.+http:\/\/json2\.test\/entries\/unknown/)
  }
})

test('should reject with error message on other error', async (t) => {
  t.plan(2)
  nock('http://json3.test')
    .put('/entries/ent1', {})
    .replyWithError('An awful error')

  try {
    await send('http://json3.test/entries/ent1', {})
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
  const req = nock('http://json4.test')
    .put('/entries/ent1', {})
    .reply(200)

  try {
    await send('http://json4.test/entries/ent1', {}, auth)
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
  nock('http://json5.test')
    .put('/entries/ent1', {})
    .reply(200)

  const ret = await send('http://json5.test/entries/ent1', {}, auth)

  t.truthy(ret)
  t.is(ret.status, 200)
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

  t.truthy(ret)
  t.is(ret.status, 200)
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

  t.truthy(ret)
  t.is(ret.status, 200)
})

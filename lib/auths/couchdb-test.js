import test from 'ava'
import nock from 'nock'

import couchdb from './couchdb'

// Helpers

const nockRequestCookie = (dbUri) => {
  return nock(dbUri, {
    reqheaders: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
    .post('/_session', 'name=theuser&password=thepassword')
      .reply(200, {ok: true}, {
        'Set-Cookie': 'AuthSession="thecookie"; Expires=Tue, 05 Mar 2017 14:06:11 GMT; Max-Age=86400; Path=/; HttpOnly; Version=1'
      })
}

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof couchdb, 'function')
})

test('should be an auth strat', (t) => {
  const auth = couchdb()

  t.truthy(auth)
  t.is(typeof auth.isAuthenticated, 'function')
  t.is(typeof auth.authenticate, 'function')
  t.is(typeof auth.getAuthObject, 'function')
  t.is(typeof auth.getAuthHeaders, 'function')
})

test('should authenticate', async (t) => {
  const scope = nockRequestCookie('https://couch1.test/db')
  const options = {
    db: 'https://couch1.test/db',
    key: 'theuser',
    secret: 'thepassword'
  }
  const auth = couchdb(options)

  const ret = await auth.authenticate()

  t.true(ret)
  t.true(scope.isDone())
})

test('should handle failed authentication', async (t) => {
  nock('https://couch2.test/db')
    .post('/_session', 'name=theuser&password=wrongpassword')
      .reply(401)
  const options = {
    db: 'https://couch2.test/db',
    key: 'theuser',
    secret: 'wrongpassword'
  }
  const auth = couchdb(options)

  const ret = await auth.authenticate()

  t.false(ret)
})

test('should handle error', async (t) => {
  nock('https://couch6.test/db')
    .post('/_session')
      .replyWithError('Catastrophy!')
  const options = {
    db: 'https://couch6.test/db',
    key: 'theuser',
    secret: 'wrongpassword'
  }
  const auth = couchdb(options)

  const ret = await auth.authenticate()

  t.false(ret)
})

test('isAuthenticated should return false', (t) => {
  const auth = couchdb()

  const ret = auth.isAuthenticated()

  t.false(ret)
})

test('isAuthenticated should return true', async (t) => {
  nockRequestCookie('https://couch3.test/db')
  const options = {
    db: 'https://couch3.test/db',
    key: 'theuser',
    secret: 'thepassword'
  }
  const auth = couchdb(options)

  await auth.authenticate()
  const ret = auth.isAuthenticated()

  t.true(ret)
})

test('getAuthHeaders should return empty object', (t) => {
  const auth = couchdb()

  const ret = auth.getAuthHeaders()

  t.deepEqual(ret, {})
})

test('getAuthHeaders should return cookie header', async (t) => {
  nockRequestCookie('https://couch4.test/db')
  const options = {
    db: 'https://couch4.test/db',
    key: 'theuser',
    secret: 'thepassword'
  }
  const expected = {
    'Cookie': 'AuthSession="thecookie"; Expires=Tue, 05 Mar 2017 14:06:11 GMT; Max-Age=86400; Path=/; HttpOnly; Version=1'
  }
  const auth = couchdb(options)

  await auth.authenticate()
  const ret = auth.getAuthHeaders()

  t.deepEqual(ret, expected)
})

test('getAuthObject should return empty object', (t) => {
  const auth = couchdb()

  const ret = auth.getAuthObject()

  t.deepEqual(ret, {})
})

test('getAuthObject should return authSession', async (t) => {
  nockRequestCookie('https://couch5.test/db')
  const options = {
    db: 'https://couch5.test/db',
    key: 'theuser',
    secret: 'thepassword'
  }
  const expected = {
    authSession: 'thecookie'
  }
  const auth = couchdb(options)

  await auth.authenticate()
  const ret = auth.getAuthObject()

  t.deepEqual(ret, expected)
})

test('getAuthObject should handle misformed cookie string', async (t) => {
  nock('https://couch6.test/db', {
    reqheaders: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
    .post('/_session', 'name=theuser&password=thepassword')
      .reply(200, {ok: true}, {
        'Set-Cookie': 'AuthSession=""'
      })
  const options = {
    db: 'https://couch6.test/db',
    key: 'theuser',
    secret: 'thepassword'
  }
  const auth = couchdb(options)

  await auth.authenticate()
  const ret = auth.getAuthObject()

  t.deepEqual(ret, {})
})

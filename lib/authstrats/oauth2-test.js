import test from 'ava'
import nock from 'nock'

import oauth2 from './oauth2'

// Helpers

const nockRequestToken = (apiUri) => {
  return nock(apiUri, {
    reqheaders: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'Authorization': 'Basic dGhldXNlcjp0aGVwYXNzd29yZCUyNg=='
    }
  })
    .post('/token', 'grant_type=client_credentials')
    .reply(200, {
      'token_type': 'bearer',
      'access_token': 'thetoken'
    })
}

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof oauth2, 'function')
})

test('should be an auth strat', (t) => {
  const auth = oauth2()

  t.truthy(auth)
  t.is(typeof auth.isAuthenticated, 'function')
  t.is(typeof auth.authenticate, 'function')
  t.is(typeof auth.getAuthObject, 'function')
  t.is(typeof auth.getAuthHeaders, 'function')
})

test('should authenticate', async (t) => {
  const scope = nockRequestToken('https://api1.test')
  const options = {
    uri: 'https://api1.test/token',
    key: 'theuser',
    secret: 'thepassword&'
  }
  const auth = oauth2(options)

  const ret = await auth.authenticate()

  t.true(ret)
  t.true(scope.isDone())
})

test('should handle failed authentication', async (t) => {
  nock('https://api2.test', {
    reqheaders: {
      'Authorization': 'Basic dGhldXNlcjp3cm9uZ3Bhc3N3b3JkJTI2'
    }
  })
    .post('/token')
    .reply(401)
  const options = {
    uri: 'https://api2.test/token',
    key: 'theuser',
    secret: 'wrongpassword&'
  }
  const auth = oauth2(options)

  const ret = await auth.authenticate()

  t.false(ret)
})

test('should handle invalid return format', async (t) => {
  nock('https://api7.test')
    .post('/token', 'grant_type=client_credentials')
    .reply(200, 'not json')
  const options = {
    uri: 'https://api7.test/token',
    key: 'theuser',
    secret: 'thepassword&'
  }
  const auth = oauth2(options)

  const ret = await auth.authenticate()

  t.false(ret)
})

test('should handle error', async (t) => {
  nock('https://api3.test')
    .post('/token')
    .replyWithError('Catastrophy!')
  const options = {
    uri: 'https://api2.test/token',
    key: 'theuser',
    secret: 'wrongpassword&'
  }
  const auth = oauth2(options)

  const ret = await auth.authenticate()

  t.false(ret)
})

test('isAuthenticated should return false', (t) => {
  const auth = oauth2()

  const ret = auth.isAuthenticated()

  t.false(ret)
})

test('isAuthenticated should return true', async (t) => {
  nockRequestToken('https://api4.test')
  const options = {
    uri: 'https://api4.test/token',
    key: 'theuser',
    secret: 'thepassword&'
  }
  const auth = oauth2(options)

  await auth.authenticate()
  const ret = auth.isAuthenticated()

  t.true(ret)
})

test('getAuthHeaders should return empty object', (t) => {
  const auth = oauth2()

  const ret = auth.getAuthHeaders()

  t.deepEqual(ret, {})
})

test('getAuthHeaders should return authorization header', async (t) => {
  nockRequestToken('https://api5.test')
  const options = {
    uri: 'https://api5.test/token',
    key: 'theuser',
    secret: 'thepassword&'
  }
  const expected = {
    'Authorization': 'Bearer thetoken'
  }
  const auth = oauth2(options)

  await auth.authenticate()
  const ret = auth.getAuthHeaders()

  t.deepEqual(ret, expected)
})

test('getAuthObject should return empty object', (t) => {
  const auth = oauth2()

  const ret = auth.getAuthObject()

  t.deepEqual(ret, {})
})

test('getAuthObject should return token', async (t) => {
  nockRequestToken('https://api6.test')
  const options = {
    uri: 'https://api6.test/token',
    key: 'theuser',
    secret: 'thepassword&'
  }
  const expected = {
    token: 'thetoken'
  }
  const auth = oauth2(options)

  await auth.authenticate()
  const ret = auth.getAuthObject()

  t.deepEqual(ret, expected)
})

import test from 'ava'
import nock = require('nock')

import oauth2 from '.'

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

test('should be an auth strat', (t) => {
  t.truthy(oauth2)
  t.is(typeof oauth2.isAuthenticated, 'function')
  t.is(typeof oauth2.authenticate, 'function')
  t.is(typeof oauth2.asObject, 'function')
  t.is(typeof oauth2.asHttpHeaders, 'function')
})

test('should authenticate', async (t) => {
  const scope = nockRequestToken('https://api1.test')
  const options = {
    uri: 'https://api1.test/token',
    key: 'theuser',
    secret: 'thepassword&'
  }
  const expected = {
    status: 'granted',
    token: 'thetoken'
  }

  const ret = await oauth2.authenticate(options)

  t.deepEqual(ret, expected)
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
  const expected = { status: 'refused' }

  const ret = await oauth2.authenticate(options)

  t.deepEqual(ret, expected)
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
  const expected = { status: 'refused' }

  const ret = await oauth2.authenticate(options)

  t.deepEqual(ret, expected)
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
  const expected = { status: 'refused' }

  const ret = await oauth2.authenticate(options)

  t.deepEqual(ret, expected)
})

test('should refuse on missing options', async (t) => {
  nock('https://api3.test')
    .post('/token')
    .replyWithError('Catastrophy!')
  const options = null
  const expected = { status: 'refused' }

  const ret = await oauth2.authenticate(options)

  t.deepEqual(ret, expected)
})

test('isAuthenticated should return false when no authentication', (t) => {
  const authentication = null

  const ret = oauth2.isAuthenticated(authentication)

  t.false(ret)
})

test('isAuthenticated should return false for refused authentication', (t) => {
  const authentication = { status: 'refused', token: 'shouldnotbehere' }

  const ret = oauth2.isAuthenticated(authentication)

  t.false(ret)
})

test('isAuthenticated should return true', async (t) => {
  nockRequestToken('https://api4.test')
  const options = {
    uri: 'https://api4.test/token',
    key: 'theuser',
    secret: 'thepassword&'
  }

  const authentication = await oauth2.authenticate(options)
  const ret = oauth2.isAuthenticated(authentication)

  t.true(ret)
})

test('asHttpHeaders should return empty object when no authentication', (t) => {
  const ret = oauth2.asHttpHeaders()

  t.deepEqual(ret, {})
})

test('asHttpHeaders should return empty object for refused authentication', (t) => {
  const ret = oauth2.asHttpHeaders({ status: 'refused', token: 'shouldnotbehere' })

  t.deepEqual(ret, {})
})

test('asHttpHeaders should return authorization header', async (t) => {
  nockRequestToken('https://api5.test')
  const options = {
    uri: 'https://api5.test/token',
    key: 'theuser',
    secret: 'thepassword&'
  }
  const expected = {
    'Authorization': 'Bearer thetoken'
  }

  const authentication = await oauth2.authenticate(options)
  const ret = oauth2.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return empty object when no authentication', (t) => {
  const ret = oauth2.asObject()

  t.deepEqual(ret, {})
})

test('asObject should return empty object for refused authentication', (t) => {
  const ret = oauth2.asObject({ status: 'refused', token: 'shouldnotbehere' })

  t.deepEqual(ret, {})
})

test('asObject should return token', async (t) => {
  nockRequestToken('https://api6.test')
  const options = {
    uri: 'https://api6.test/token',
    key: 'theuser',
    secret: 'thepassword&'
  }
  const expected = {
    token: 'thetoken'
  }

  const authentication = await oauth2.authenticate(options)
  const ret = oauth2.asObject(authentication)

  t.deepEqual(ret, expected)
})

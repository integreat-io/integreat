import test from 'ava'
import nock = require('nock')

import oauth2 from '.'

// Helpers

const nockRequestToken = (apiUri: string) => {
  return nock(apiUri, {
    reqheaders: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Authorization: 'Basic dGhldXNlcjp0aGVwYXNzd29yZCUyNg==',
    },
  })
    .post('/token', 'grant_type=client_credentials')
    .reply(200, {
      ['token_type']: 'bearer',
      ['access_token']: 'thetoken',
    })
}

test.after(() => {
  nock.restore()
})

// Tests

test('should be an auth strat', (t) => {
  t.truthy(oauth2)
  t.is(typeof oauth2.isAuthenticated, 'function')
  t.is(typeof oauth2.authenticate, 'function')
  t.is(typeof oauth2.authentication.asObject, 'function')
  t.is(typeof oauth2.authentication.asHttpHeaders, 'function')
})

test('should authenticate', async (t) => {
  const scope = nockRequestToken('http://api1.test')
  const options = {
    uri: 'http://api1.test/token',
    key: 'theuser',
    secret: 'thepassword&',
  }
  const expected = {
    status: 'granted',
    token: 'thetoken',
  }

  const ret = await oauth2.authenticate(options)

  t.deepEqual(ret, expected)
  t.true(scope.isDone())
})

test('should handle failed authentication', async (t) => {
  nock('http://api2.test', {
    reqheaders: {
      Authorization: 'Basic dGhldXNlcjp3cm9uZ3Bhc3N3b3JkJTI2',
    },
  })
    .post('/token')
    .reply(401)
  const options = {
    uri: 'http://api2.test/token',
    key: 'theuser',
    secret: 'wrongpassword&',
  }
  const expected = { status: 'refused' }

  const ret = await oauth2.authenticate(options)

  t.deepEqual(ret, expected)
})

test('should handle invalid return format', async (t) => {
  nock('http://api3.test')
    .post('/token', 'grant_type=client_credentials')
    .reply(200, 'not json')
  const options = {
    uri: 'http://api3.test/token',
    key: 'theuser',
    secret: 'thepassword&',
  }
  const expected = { status: 'refused' }

  const ret = await oauth2.authenticate(options)

  t.deepEqual(ret, expected)
})

test('should handle error', async (t) => {
  nock('http://api4.test').post('/token').reply(500, 'Catastrophy!')
  const options = {
    uri: 'http://api4.test/token',
    key: 'theuser',
    secret: 'password&',
  }
  const expected = { status: 'refused' }

  const ret = await oauth2.authenticate(options)

  t.deepEqual(ret, expected)
})

test('should refuse on no options object', async (t) => {
  nockRequestToken('http://api5.test')
  const options = null
  const expected = { status: 'refused' }

  const ret = await oauth2.authenticate(options)

  t.deepEqual(ret, expected)
})

test('should refuse on undefined options', async (t) => {
  const scope = nock('http://api6.test')
    .post('/token')
    .replyWithError('Catastrophy!')
  const options = { uri: 'http://api6.test/token' }
  const expected = { status: 'refused' }

  const ret = await oauth2.authenticate(options)

  t.deepEqual(ret, expected)
  t.false(scope.isDone())
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
  nockRequestToken('http://api7.test')
  const options = {
    uri: 'http://api7.test/token',
    key: 'theuser',
    secret: 'thepassword&',
  }

  const authentication = await oauth2.authenticate(options)
  const ret = oauth2.isAuthenticated(authentication)

  t.true(ret)
})

test('asHttpHeaders should return empty object when no authentication', (t) => {
  const ret = oauth2.authentication.asHttpHeaders(null)

  t.deepEqual(ret, {})
})

test('asHttpHeaders should return empty object for refused authentication', (t) => {
  const ret = oauth2.authentication.asHttpHeaders({
    status: 'refused',
    token: 'shouldnotbehere',
  })

  t.deepEqual(ret, {})
})

test('asHttpHeaders should return authorization header', async (t) => {
  nockRequestToken('http://api8.test')
  const options = {
    uri: 'http://api8.test/token',
    key: 'theuser',
    secret: 'thepassword&',
  }
  const expected = {
    Authorization: 'Bearer thetoken',
  }

  const authentication = await oauth2.authenticate(options)
  const ret = oauth2.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return empty object when no authentication', (t) => {
  const ret = oauth2.authentication.asObject(null)

  t.deepEqual(ret, {})
})

test('asObject should return empty object for refused authentication', (t) => {
  const ret = oauth2.authentication.asObject({
    status: 'refused',
    token: 'shouldnotbehere',
  })

  t.deepEqual(ret, {})
})

test('asObject should return token', async (t) => {
  nockRequestToken('http://api9.test')
  const options = {
    uri: 'http://api9.test/token',
    key: 'theuser',
    secret: 'thepassword&',
  }
  const expected = {
    token: 'thetoken',
  }

  const authentication = await oauth2.authenticate(options)
  const ret = oauth2.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

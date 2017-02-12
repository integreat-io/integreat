import test from 'ava'

import TokenStrategy from './token'

test('should exist', (t) => {
  t.is(typeof TokenStrategy, 'function')
})

test('isAuthenticated should exist', (t) => {
  const strat = new TokenStrategy()

  t.is(typeof strat.isAuthenticated, 'function')
})

test('isAuthenticated should return false by default', (t) => {
  const strat = new TokenStrategy()

  t.false(strat.isAuthenticated())
})

test('isAuthenticated should return true when token is set', (t) => {
  const strat = new TokenStrategy({token: 'someToken'})

  t.true(strat.isAuthenticated())
})

test('getAuthHeaders should exist', (t) => {
  const strat = new TokenStrategy()

  t.is(typeof strat.getAuthHeaders, 'function')
})

test('getAuthHeaders should return auth header with token', (t) => {
  const strat = new TokenStrategy({token: 'someToken'})
  const expected = {'Authorization': 'Bearer someToken'}

  const headers = strat.getAuthHeaders()

  t.deepEqual(headers, expected)
})

test('getAuthHeaders should return auth header with given type', (t) => {
  const strat = new TokenStrategy({token: 'someToken', type: 'Basic'})
  const expected = {'Authorization': 'Basic someToken'}

  const headers = strat.getAuthHeaders()

  t.deepEqual(headers, expected)
})

test('getAuthHeaders should base64 encode token when options say so', (t) => {
  const strat = new TokenStrategy({token: 'someToken', encode: true})
  const expected = {'Authorization': 'Bearer c29tZVRva2Vu'}

  const headers = strat.getAuthHeaders()

  t.deepEqual(headers, expected)
})

test('getAuthHeaders should return empty object when no token', (t) => {
  const strat = new TokenStrategy({})

  const headers = strat.getAuthHeaders()

  t.deepEqual(headers, {})
})

test('authenticate should exist', (t) => {
  const strat = new TokenStrategy({})

  t.is(typeof strat.authenticate, 'function')
})

test('authenticate should return true when token is set', (t) => {
  const strat = new TokenStrategy({token: 'someToken'})

  return strat.authenticate()

  .then((ret) => {
    t.true(ret)
  })
})

test('authenticate should return false when token is not set', (t) => {
  const strat = new TokenStrategy({})

  return strat.authenticate()

  .then((ret) => {
    t.false(ret)
  })
})

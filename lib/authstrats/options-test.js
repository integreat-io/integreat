import test from 'ava'

import optionsAuth from './options'

test('should exist', (t) => {
  t.is(typeof optionsAuth, 'function')
})

test('isAuthenticated should exist', (t) => {
  const strat = optionsAuth()

  t.is(typeof strat.isAuthenticated, 'function')
})

test('isAuthenticated should always return true', (t) => {
  const strat = optionsAuth()

  const ret = strat.isAuthenticated()

  t.true(ret)
})

test('getAuthHeaders should exist', (t) => {
  const strat = optionsAuth()

  t.is(typeof strat.getAuthHeaders, 'function')
})

test('getAuthHeaders should return an empty object', (t) => {
  const options = { username: 'bill', password: 'secret' }
  const strat = optionsAuth(options)

  const ret = strat.getAuthHeaders()

  t.deepEqual(ret, {})
})

test('getAuthObject should exist', (t) => {
  const strat = optionsAuth()

  t.is(typeof strat.getAuthObject, 'function')
})

test('getAuthObject should return the options object', (t) => {
  const options = { username: 'bill', password: 'secret' }
  const strat = optionsAuth(options)

  const ret = strat.getAuthObject()

  t.deepEqual(ret, options)
})

test('authenticate should exist', (t) => {
  const strat = optionsAuth({})

  t.is(typeof strat.authenticate, 'function')
})

test('authenticate should always return true', (t) => {
  const strat = optionsAuth()

  return strat.authenticate()

    .then((ret) => {
      t.true(ret)
    })
})

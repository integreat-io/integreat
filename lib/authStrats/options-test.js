import test from 'ava'

import OptionsStrategy from './options'

test('should exist', (t) => {
  t.is(typeof OptionsStrategy, 'function')
})

test('isAuthenticated should exist', (t) => {
  const strat = new OptionsStrategy()

  t.is(typeof strat.isAuthenticated, 'function')
})

test('isAuthenticated should always return true', (t) => {
  const strat = new OptionsStrategy()

  const ret = strat.isAuthenticated()

  t.true(ret)
})

test('getAuthHeaders should exist', (t) => {
  const strat = new OptionsStrategy()

  t.is(typeof strat.getAuthHeaders, 'function')
})

test('getAuthHeaders should return an empty object', (t) => {
  const options = {username: 'bill', password: 'secret'}
  const strat = new OptionsStrategy(options)

  const ret = strat.getAuthHeaders()

  t.deepEqual(ret, {})
})

test('getAuthObject should exist', (t) => {
  const strat = new OptionsStrategy()

  t.is(typeof strat.getAuthObject, 'function')
})

test('getAuthObject should return the options object', (t) => {
  const options = {username: 'bill', password: 'secret'}
  const strat = new OptionsStrategy(options)

  const ret = strat.getAuthObject()

  t.deepEqual(ret, options)
})

test('authenticate should exist', (t) => {
  const strat = new OptionsStrategy({})

  t.is(typeof strat.authenticate, 'function')
})

test('authenticate should always return true', (t) => {
  const strat = new OptionsStrategy()

  return strat.authenticate()

  .then((ret) => {
    t.true(ret)
  })
})

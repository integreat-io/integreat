import test from 'ava'

import gatherResources from './gatherResources'

const authstrats = [
  'oauth2',
  'options',
  'token'
]
const dir = '../authstrats'

test('should exist', (t) => {
  t.is(typeof gatherResources, 'function')
})

test('should return object with authstrats', (t) => {
  const ret = gatherResources(authstrats, dir)()

  t.truthy(ret)
  t.is(typeof ret.oauth2, 'function')
  t.is(typeof ret.options, 'function')
  t.is(typeof ret.token, 'function')
})

test('should return only token authstrat', (t) => {
  const ret = gatherResources(authstrats, dir)('token')

  t.is(typeof ret.token, 'function')
  t.is(ret.oauth2, undefined)
  t.is(ret.options, undefined)
})

test('should return options and token authstrats', (t) => {
  const ret = gatherResources(authstrats, dir)('options', 'token')

  t.is(typeof ret.options, 'function')
  t.is(typeof ret.token, 'function')
  t.is(ret.oauth2, undefined)
})

test('should not return unknown authstrat', (t) => {
  const ret = gatherResources(authstrats, dir)('unknown')

  t.is(Object.keys(ret).length, 0)
})

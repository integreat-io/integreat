import test from 'ava'

import gatherResources from './gatherResources'

const authenticators = [
  'oauth2',
  'options',
  'token'
]
const dir = '../authenticators'

test('should exist', (t) => {
  t.is(typeof gatherResources, 'function')
})

test('should return object with authenticators', (t) => {
  const ret = gatherResources(authenticators, dir)()

  t.truthy(ret)
  t.is(typeof ret.oauth2, 'object')
  t.is(typeof ret.options, 'object')
  t.is(typeof ret.token, 'object')
})

test('should return only token authenticator', (t) => {
  const ret = gatherResources(authenticators, dir)('token')

  t.is(typeof ret.token, 'object')
  t.is(ret.oauth2, undefined)
  t.is(ret.options, undefined)
})

test('should return options and token authenticators', (t) => {
  const ret = gatherResources(authenticators, dir)('options', 'token')

  t.is(typeof ret.options, 'object')
  t.is(typeof ret.token, 'object')
  t.is(ret.oauth2, undefined)
})

test('should not return unknown authenticators', (t) => {
  const ret = gatherResources(authenticators, dir)('unknown')

  t.is(Object.keys(ret).length, 0)
})

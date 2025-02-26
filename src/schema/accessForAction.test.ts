import test from 'node:test'
import assert from 'node:assert/strict'

import accessForAction from './accessForAction.js'

// Tests

test('should get access from access object', () => {
  const access = { allow: 'all' }
  const actionType = 'GET'
  const expected = { allow: 'all' }

  const ret = accessForAction(access, actionType)

  assert.deepEqual(ret, expected)
})

test('should force role prop to array', () => {
  const access = { role: 'admin' }
  const actionType = 'GET'
  const expected = { role: ['admin'] }

  const ret = accessForAction(access, actionType)

  assert.deepEqual(ret, expected)
})

test('should get force ident to array', () => {
  const access = { ident: 'johnf' }
  const actionType = 'GET'
  const expected = { ident: ['johnf'] }

  const ret = accessForAction(access, actionType)

  assert.deepEqual(ret, expected)
})

test('should get access from empty access object', () => {
  const access = {}
  const actionType = 'GET'
  const expected = {}

  const ret = accessForAction(access, actionType)

  assert.deepEqual(ret, expected)
})

test('should get access from missing access object', () => {
  const access = undefined
  const actionType = 'GET'
  const expected = {}

  const ret = accessForAction(access, actionType)

  assert.deepEqual(ret, expected)
})

test('should get access from null', () => {
  const access = null
  const actionType = 'GET'
  const expected = { allow: 'none' }

  const ret = accessForAction(access, actionType)

  assert.deepEqual(ret, expected)
})

test('should get access for action override', () => {
  const access = { allow: 'none', actions: { GET: 'all' } }
  const actionType = 'GET'
  const expected = { allow: 'all' }

  const ret = accessForAction(access, actionType)

  assert.deepEqual(ret, expected)
})

test('should get access for action override whit action prefix', () => {
  const access = { allow: 'none', actions: { GET: 'all' } }
  const actionType = 'GET_SOMETHING'
  const expected = { allow: 'all' }

  const ret = accessForAction(access, actionType)

  assert.deepEqual(ret, expected)
})

test('should get default access for action without override', () => {
  const access = { allow: 'none', actions: { GET: 'all' } }
  const actionType = 'SET'
  const expected = { allow: 'none' }

  const ret = accessForAction(access, actionType)

  assert.deepEqual(ret, expected)
})

test('should only allow accepted methods', () => {
  assert.deepEqual(accessForAction({ allow: 'all' }, 'GET'), { allow: 'all' })
  assert.deepEqual(accessForAction({ allow: 'auth' }, 'GET'), { allow: 'auth' })
  assert.deepEqual(accessForAction({ allow: undefined }, 'GET'), {})
  assert.deepEqual(accessForAction({ allow: 'none' }, 'GET'), { allow: 'none' })
  assert.deepEqual(accessForAction({ allow: 'illegal' }, 'GET'), {
    allow: 'none',
  })
  assert.deepEqual(accessForAction(undefined, 'GET'), {})
})

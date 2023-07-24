import test from 'ava'

import accessForAction from './accessForAction.js'

// Tests

test('should get access from access object', (t) => {
  const access = { allow: 'all' }
  const actionType = 'GET'
  const expected = { allow: 'all' }

  const ret = accessForAction(access, actionType)

  t.deepEqual(ret, expected)
})

test('should force role prop to array', (t) => {
  const access = { role: 'admin' }
  const actionType = 'GET'
  const expected = { role: ['admin'] }

  const ret = accessForAction(access, actionType)

  t.deepEqual(ret, expected)
})

test('should get force ident to array', (t) => {
  const access = { ident: 'johnf' }
  const actionType = 'GET'
  const expected = { ident: ['johnf'] }

  const ret = accessForAction(access, actionType)

  t.deepEqual(ret, expected)
})

test('should get access from empty access object', (t) => {
  const access = {}
  const actionType = 'GET'
  const expected = {}

  const ret = accessForAction(access, actionType)

  t.deepEqual(ret, expected)
})

test('should get access from missing access object', (t) => {
  const access = undefined
  const actionType = 'GET'
  const expected = {}

  const ret = accessForAction(access, actionType)

  t.deepEqual(ret, expected)
})

test('should get access from null', (t) => {
  const access = null
  const actionType = 'GET'
  const expected = { allow: 'none' }

  const ret = accessForAction(access, actionType)

  t.deepEqual(ret, expected)
})

test('should get access for action override', (t) => {
  const access = { allow: 'none', actions: { GET: 'all' } }
  const actionType = 'GET'
  const expected = { allow: 'all' }

  const ret = accessForAction(access, actionType)

  t.deepEqual(ret, expected)
})

test('should get access for action override whit action prefix', (t) => {
  const access = { allow: 'none', actions: { GET: 'all' } }
  const actionType = 'GET_SOMETHING'
  const expected = { allow: 'all' }

  const ret = accessForAction(access, actionType)

  t.deepEqual(ret, expected)
})

test('should get default access for action without override', (t) => {
  const access = { allow: 'none', actions: { GET: 'all' } }
  const actionType = 'SET'
  const expected = { allow: 'none' }

  const ret = accessForAction(access, actionType)

  t.deepEqual(ret, expected)
})

test('should only allow accepted methods', (t) => {
  t.deepEqual(accessForAction({ allow: 'all' }, 'GET'), { allow: 'all' })
  t.deepEqual(accessForAction({ allow: 'auth' }, 'GET'), { allow: 'auth' })
  t.deepEqual(accessForAction({ allow: undefined }, 'GET'), {})
  t.deepEqual(accessForAction({ allow: 'none' }, 'GET'), { allow: 'none' })
  t.deepEqual(accessForAction({ allow: 'illegal' }, 'GET'), { allow: 'none' })
  t.deepEqual(accessForAction(undefined, 'GET'), {})
})

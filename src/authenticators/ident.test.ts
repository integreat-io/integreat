import test from 'node:test'
import assert from 'node:assert/strict'
import dispatch from '../tests/helpers/dispatch.js'
import { IdentType } from '../types.js'

import authenticator from './ident.js'

// Setup

const action = {
  type: 'GET',
  payload: { type: 'entry' },
  meta: { ident: { id: 'johnf' } },
}

const options = {}

// Tests

test('authenticate should always grant', async () => {
  const expected = { status: 'granted' }

  const ret = await authenticator.authenticate(options, action, dispatch, null)

  assert.deepEqual(ret, expected)
})

test('isAuthenticated should always return true', () => {
  const authentication = { status: 'granted' } // Doesn't matter what we pass here

  assert.equal(
    authenticator.isAuthenticated(authentication, options, action),
    true,
  )
})

test('asHttpHeaders should return empty object', () => {
  const authentication = { status: 'granted' }
  const expected = {}

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  assert.deepEqual(ret, expected)
})

test('asObject should return empty object', () => {
  const authentication = { status: 'granted' } // Doesn't matter what we pass here
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  assert.deepEqual(ret, expected)
})

test('validate should return response with ident anonymous', async () => {
  const authentication = { status: 'granted' } // Doesn't matter what we pass here
  const expected = {
    status: 'ok',
    access: { ident: { id: 'anonymous', type: IdentType.Anon } },
  }

  const ret = await authenticator.validate?.(
    authentication,
    options,
    action,
    dispatch,
  )

  assert.deepEqual(ret, expected)
})

test('validate should return response with ident with the id set in options', async () => {
  const options = { identId: 'johnf' }
  const authentication = { status: 'granted' } // Doesn't matter what we pass here
  const expected = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await authenticator.validate?.(
    authentication,
    options,
    action,
    dispatch,
  )

  assert.deepEqual(ret, expected)
})

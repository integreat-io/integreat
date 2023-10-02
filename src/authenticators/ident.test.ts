import test from 'ava'

import authenticator from './ident.js'
import { IdentType } from '../types.js'

// Setup

const action = {
  type: 'GET',
  payload: { type: 'entry' },
  meta: { ident: { id: 'johnf' } },
}

const options = {}

// Tests

test('authenticate should always grant', async (t) => {
  const expected = { status: 'granted' }

  const ret = await authenticator.authenticate(options, action)

  t.deepEqual(ret, expected)
})

test('isAuthenticated should always return true', (t) => {
  const authentication = { status: 'granted' } // Doesn't matter what we pass here

  t.true(authenticator.isAuthenticated(authentication, options, action))
})

test('asHttpHeaders should return empty object', (t) => {
  const authentication = { status: 'granted' }
  const expected = {}

  const ret = authenticator.authentication.asHttpHeaders(authentication)

  t.deepEqual(ret, expected)
})

test('asObject should return empty object', (t) => {
  const authentication = { status: 'granted' } // Doesn't matter what we pass here
  const expected = {}

  const ret = authenticator.authentication.asObject(authentication)

  t.deepEqual(ret, expected)
})

test('validate should return response with ident anonymous', async (t) => {
  const authentication = { status: 'granted' } // Doesn't matter what we pass here
  const expected = {
    status: 'ok',
    access: { ident: { id: 'anonymous', type: IdentType.Anon } },
  }

  const ret = await authenticator.validate!(authentication, options, action)

  t.deepEqual(ret, expected)
})

test('validate should return response with ident with the id set in options', async (t) => {
  const options = { identId: 'johnf' }
  const authentication = { status: 'granted' } // Doesn't matter what we pass here
  const expected = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await authenticator.validate!(authentication, options, action)

  t.deepEqual(ret, expected)
})

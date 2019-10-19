import test from 'ava'
import token from '../authenticators/token'

import createAuth from '.'

// Setup

const authenticators = { token }

// Tests

test('should create auth object', t => {
  const def = {
    id: 'auth1',
    authenticator: 'token',
    options: { token: 't0k3n' }
  }

  const auth = createAuth(def, authenticators)

  t.truthy(auth)
  t.is(auth.id, 'auth1')
  t.is(auth.authenticator, token)
  t.deepEqual(auth.options, { token: 't0k3n' })
  t.is(auth.authentication, null)
})

test('should return null when no auth definition', t => {
  const auth = createAuth(undefined, authenticators)

  t.is(auth, undefined)
})

test('should throw when no authenticators', t => {
  const def = {
    id: 'auth1',
    authenticator: 'token',
    options: { token: 't0k3n' }
  }

  const err = t.throws(() => createAuth(def, undefined))

  t.true(err instanceof Error)
  t.is(err.message, 'No authenticators were supplied')
})

test('should throw on unknown authenticator', t => {
  const def = {
    id: 'auth1',
    authenticator: 'unknown',
    options: { token: 't0k3n' }
  }

  const err = t.throws(() => createAuth(def, authenticators))

  t.true(err instanceof Error)
  t.is(err.message, "Could not find the authenticator 'unknown'")
})

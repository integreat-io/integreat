import test from 'ava'

import { createErrorResponse, setOrigin } from './response.js'

// Tests -- createErrorResponse

test('should create an error response', (t) => {
  const message = 'An ugly error'
  const expected = {
    status: 'error',
    error: 'An ugly error',
    origin: 'somewhere',
  }

  const ret = createErrorResponse(message, 'somewhere')

  t.deepEqual(ret, expected)
})

test('should create an error response with a specified status', (t) => {
  const message = 'An ugly error'
  const status = 'notfound'
  const expected = {
    status: 'notfound',
    error: 'An ugly error',
    origin: 'somewhere',
  }

  const ret = createErrorResponse(message, 'somewhere', status)

  t.deepEqual(ret, expected)
})

test('should extract error message from Error', (t) => {
  const message = new Error('An ugly error')
  const expected = {
    status: 'error',
    error: 'An ugly error',
    origin: 'somewhere',
  }

  const ret = createErrorResponse(message, 'somewhere')

  t.deepEqual(ret, expected)
})

// Tests -- setOrigin

test('should set origin on response', (t) => {
  const response = { status: 'error', error: 'We failed' }
  const origin = 'somewhere:bad'
  const expected = {
    status: 'error',
    error: 'We failed',
    origin: 'somewhere:bad',
  }

  const ret = setOrigin(response, origin)

  t.deepEqual(ret, expected)
})

test('should not set origin when one already exists', (t) => {
  const response = {
    status: 'error',
    error: 'We failed',
    origin: 'somewhere:else',
  }
  const origin = 'somewhere:bad'
  const expected = {
    status: 'error',
    error: 'We failed',
    origin: 'somewhere:else',
  }

  const ret = setOrigin(response, origin)

  t.deepEqual(ret, expected)
})

test('should prefix origin when one already exists', (t) => {
  const doPrefix = true
  const response = {
    status: 'error',
    error: 'We failed',
    origin: 'somewhere:else',
  }
  const origin = 'and:here'
  const expected = {
    status: 'error',
    error: 'We failed',
    origin: 'and:here:somewhere:else',
  }

  const ret = setOrigin(response, origin, doPrefix)

  t.deepEqual(ret, expected)
})

test('should set prefix as origin when none is set already', (t) => {
  const doPrefix = true
  const response = {
    status: 'error',
    error: 'We failed',
    // No origin
  }
  const origin = 'and:here'
  const expected = {
    status: 'error',
    error: 'We failed',
    origin: 'and:here',
  }

  const ret = setOrigin(response, origin, doPrefix)

  t.deepEqual(ret, expected)
})

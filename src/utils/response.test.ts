import test from 'ava'
import type { Response } from '../types.js'

import { createErrorResponse, combineResponses, setOrigin } from './response.js'

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

// Tests -- combineResponses

test('should combine two error responses', (t) => {
  const responses = [
    { status: 'error', error: 'Wait, what?' },
    { status: 'badrequest', error: 'Makes no sense' },
  ]
  const expected = {
    status: 'error',
    error: '[error] Wait, what? | [badrequest] Makes no sense',
  }

  const ret = combineResponses(responses)

  t.deepEqual(ret, expected)
})

test('should handle undefined in response list', (t) => {
  const responses = [
    { status: 'error', error: 'Wait, what?' },
    undefined,
    { status: 'badrequest', error: 'Makes no sense' },
  ]
  const expected = {
    status: 'error',
    error: '[error] Wait, what? | [badrequest] Makes no sense',
  }

  const ret = combineResponses(responses as Response[])

  t.deepEqual(ret, expected)
})

test('should return status from responses if they are the same', (t) => {
  const responses = [
    { status: 'badrequest', error: 'Wait, what?' },
    { status: 'badrequest', error: 'Makes no sense' },
  ]
  const expected = {
    status: 'badrequest',
    error: '[badrequest] Wait, what? | [badrequest] Makes no sense',
  }

  const ret = combineResponses(responses)

  t.deepEqual(ret, expected)
})

test('should return error from responses if they are the same', (t) => {
  const responses = [
    { status: 'badrequest', error: 'Makes no sense' },
    { status: 'badrequest', error: 'Makes no sense' },
  ]
  const expected = {
    status: 'badrequest',
    error: 'Makes no sense',
  }

  const ret = combineResponses(responses)

  t.deepEqual(ret, expected)
})

test('should only include one of each error', (t) => {
  const responses = [
    { status: 'badrequest', error: 'Makes no sense' },
    { status: 'timeout', error: 'Took too long' },
    { status: 'badrequest', error: 'Makes no sense' },
  ]
  const expected = {
    status: 'error',
    error: '[badrequest] Makes no sense | [timeout] Took too long',
  }

  const ret = combineResponses(responses)

  t.deepEqual(ret, expected)
})

test('should combine two ok responses with warning', (t) => {
  const responses = [
    { status: 'ok', warning: 'Almost failed' },
    { status: 'ok', warning: 'We removed something' },
  ]
  const expected = {
    status: 'ok',
    warning: 'Almost failed | We removed something',
  }

  const ret = combineResponses(responses)

  t.deepEqual(ret, expected)
})

test('should keep only one warning when they are equal', (t) => {
  const responses = [
    { status: 'ok', warning: 'Almost failed' },
    { status: 'ok', warning: 'Almost failed' },
  ]
  const expected = {
    status: 'ok',
    warning: 'Almost failed',
  }

  const ret = combineResponses(responses)

  t.deepEqual(ret, expected)
})

test('should return origin when everyone has the same', (t) => {
  const responses = [
    { status: 'error', error: 'Wait, what?', origin: 'in:there' },
    { status: 'badrequest', error: 'Makes no sense', origin: 'in:there' },
  ]
  const expected = {
    status: 'error',
    error: '[error] Wait, what? | [badrequest] Makes no sense',
    origin: 'in:there',
  }

  const ret = combineResponses(responses)

  t.deepEqual(ret, expected)
})

test('should not return origin when there are different ones', (t) => {
  const responses = [
    { status: 'error', error: 'Wait, what?', origin: 'in:there' },
    { status: 'badrequest', error: 'Makes no sense', origin: 'in:here' },
  ]
  const expected = {
    status: 'error',
    error: '[error] Wait, what? | [badrequest] Makes no sense',
  }

  const ret = combineResponses(responses)

  t.deepEqual(ret, expected)
})

test('should return response when only one', (t) => {
  const responses = [{ status: 'ok', data: 'some data' }]

  const ret = combineResponses(responses)

  t.deepEqual(ret, responses[0])
})

test('should return undefined when no response', (t) => {
  const responses: Response[] = []

  const ret = combineResponses(responses)

  t.deepEqual(ret, undefined)
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

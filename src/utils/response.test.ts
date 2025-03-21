import test from 'node:test'
import assert from 'node:assert/strict'
import type { Response } from '../types.js'

import { createErrorResponse, combineResponses, setOrigin } from './response.js'

// Tests -- createErrorResponse

test('should create an error response', () => {
  const message = 'An ugly error'
  const expected = {
    status: 'error',
    error: 'An ugly error',
    origin: 'somewhere',
  }

  const ret = createErrorResponse(message, 'somewhere')

  assert.deepEqual(ret, expected)
})

test('should create an error response with a specified status', () => {
  const message = 'An ugly error'
  const status = 'notfound'
  const expected = {
    status: 'notfound',
    error: 'An ugly error',
    origin: 'somewhere',
  }

  const ret = createErrorResponse(message, 'somewhere', status)

  assert.deepEqual(ret, expected)
})

test('should extract error message from Error', () => {
  const message = new Error('An ugly error')
  const expected = {
    status: 'error',
    error: 'An ugly error',
    origin: 'somewhere',
  }

  const ret = createErrorResponse(message, 'somewhere')

  assert.deepEqual(ret, expected)
})

test('should create a response with warning', () => {
  const message = 'Nothing too important'
  const status = 'noaction'
  const expected = {
    status: 'noaction',
    warning: 'Nothing too important',
    origin: 'somewhere',
  }

  const ret = createErrorResponse(message, 'somewhere', status)

  assert.deepEqual(ret, expected)
})

// Tests -- combineResponses

test('should combine two error responses', () => {
  const responses = [
    { status: 'error', error: 'Wait, what?' },
    { status: 'badrequest', error: 'Makes no sense' },
  ]
  const expected = {
    status: 'error',
    error: '[error] Wait, what? | [badrequest] Makes no sense',
  }

  const ret = combineResponses(responses)

  assert.deepEqual(ret, expected)
})

test('should handle undefined in response list', () => {
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

  assert.deepEqual(ret, expected)
})

test('should return status from responses if they are the same', () => {
  const responses = [
    { status: 'badrequest', error: 'Wait, what?' },
    { status: 'badrequest', error: 'Makes no sense' },
  ]
  const expected = {
    status: 'badrequest',
    error: '[badrequest] Wait, what? | [badrequest] Makes no sense',
  }

  const ret = combineResponses(responses)

  assert.deepEqual(ret, expected)
})

test('should return error from responses if they are the same', () => {
  const responses = [
    { status: 'badrequest', error: 'Makes no sense' },
    { status: 'badrequest', error: 'Makes no sense' },
  ]
  const expected = {
    status: 'badrequest',
    error: '[badrequest] Makes no sense',
  }

  const ret = combineResponses(responses)

  assert.deepEqual(ret, expected)
})

test('should only include one of each error', () => {
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

  assert.deepEqual(ret, expected)
})

test('should combine two ok responses with warning', () => {
  const responses = [
    { status: 'ok', warning: 'Almost failed' },
    { status: 'ok', warning: 'We removed something' },
  ]
  const expected = {
    status: 'ok',
    warning: 'Almost failed | We removed something',
  }

  const ret = combineResponses(responses)

  assert.deepEqual(ret, expected)
})

test('should keep only one warning when they are equal', () => {
  const responses = [
    { status: 'ok', warning: 'Almost failed' },
    { status: 'ok', warning: 'Almost failed' },
  ]
  const expected = {
    status: 'ok',
    warning: 'Almost failed',
  }

  const ret = combineResponses(responses)

  assert.deepEqual(ret, expected)
})

test('should return origin when everyone has the same', () => {
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

  assert.deepEqual(ret, expected)
})

test('should not return origin when there are different ones', () => {
  const responses = [
    { status: 'error', error: 'Wait, what?', origin: 'in:there' },
    { status: 'badrequest', error: 'Makes no sense', origin: 'in:here' },
  ]
  const expected = {
    status: 'error',
    error: '[error] Wait, what? | [badrequest] Makes no sense',
  }

  const ret = combineResponses(responses)

  assert.deepEqual(ret, expected)
})

test('should return response when only one', () => {
  const responses = [{ status: 'ok', data: 'some data' }]

  const ret = combineResponses(responses)

  assert.deepEqual(ret, responses[0])
})

test('should return undefined when no response', () => {
  const responses: Response[] = []

  const ret = combineResponses(responses)

  assert.deepEqual(ret, undefined)
})

// Tests -- setOrigin

test('should set origin on response', () => {
  const response = { status: 'error', error: 'We failed' }
  const origin = 'somewhere:bad'
  const expected = {
    status: 'error',
    error: 'We failed',
    origin: 'somewhere:bad',
  }

  const ret = setOrigin(response, origin)

  assert.deepEqual(ret, expected)
})

test('should set origin on response when only error is set', () => {
  const response = { error: 'We failed' }
  const origin = 'somewhere:bad'
  const expected = {
    error: 'We failed',
    origin: 'somewhere:bad',
  }

  const ret = setOrigin(response, origin)

  assert.deepEqual(ret, expected)
})

test('should not set origin when one already exists', () => {
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

  assert.deepEqual(ret, expected)
})

test('should prefix origin when one already exists', () => {
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

  assert.deepEqual(ret, expected)
})

test('should set prefix as origin when none is set already', () => {
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

  assert.deepEqual(ret, expected)
})

test('should not set origin when no status', () => {
  const response = {}
  const origin = 'somewhere:bad'
  const expected = {}

  const ret = setOrigin(response, origin)

  assert.deepEqual(ret, expected)
})

test('should not set origin when error is empty string', () => {
  const response = { error: '' }
  const origin = 'somewhere:bad'
  const expected = { error: '' }

  const ret = setOrigin(response, origin)

  assert.deepEqual(ret, expected)
})

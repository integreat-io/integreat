import test from 'node:test'
import assert from 'node:assert/strict'
import mapTransform from 'map-transform'
import integreatTransformers from 'integreat-transformers'
import type { ValidateObject } from '../types.js'

import prepareValidator from './validation.js'

// Setup

const mapOptions = {
  transformers: { size: integreatTransformers.size },
}

// Tests

test('should return empty error array when validations succeeds', async () => {
  const conditions = [
    {
      condition: {
        $transform: 'compare',
        path: 'getEntries.response.status',
        match: 'ok',
      },
      failResponse: 'Response must be ok',
    },
    {
      condition: ['getEntries.response.data', { $transform: 'size' }],
      failResponse: {
        status: 'noaction',
        error: 'No data to set',
      },
    },
  ]
  const action = {
    getEntries: {
      response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
    },
  }
  const expected = [[], false]

  const validator = prepareValidator(conditions, mapTransform, mapOptions)
  const ret = await validator(action)

  assert.deepEqual(ret, expected)
})

test('should return error response when validations fails', async () => {
  const conditions = [
    {
      condition: {
        $transform: 'compare',
        path: 'getEntries.response.status',
        match: 'ok',
      },
      failResponse: 'Response must be ok',
    },
    {
      condition: ['getEntries.response.data', { $transform: 'size' }],
      failResponse: {
        status: 'noaction',
        error: 'No data to set',
      },
    },
  ]
  const action = {
    getEntries: {
      response: { status: 'queued', data: [{ id: 'ent1', $type: 'entry' }] },
    },
  }
  const expected = [
    [
      {
        status: 'badrequest',
        error: 'Response must be ok',
      },
    ],
    false,
  ]

  const validator = prepareValidator(conditions, mapTransform, mapOptions)
  const ret = await validator(action)

  assert.deepEqual(ret, expected)
})

test('should return several error responses when validations fails', async () => {
  const conditions = [
    {
      condition: {
        $transform: 'compare',
        path: 'getEntries.response.status',
        match: 'ok',
      },
      failResponse: 'Response must be ok',
    },
    {
      condition: ['getEntries.response.data', { $transform: 'size' }],
      failResponse: {
        status: 'noaction',
        error: 'No data to set',
      },
    },
  ]
  const action = {
    getEntries: {
      response: { status: 'error', error: 'We got it wrong' },
    },
  }
  const expected = [
    [
      {
        status: 'badrequest',
        error: 'Response must be ok',
      },
      {
        status: 'noaction',
        error: 'No data to set',
      },
    ],
    false,
  ]

  const validator = prepareValidator(conditions, mapTransform, mapOptions)
  const ret = await validator(action)

  assert.deepEqual(ret, expected)
})

test('should set break to true if any of the failing conditions has break set to true', async () => {
  const conditions = [
    {
      condition: {
        $transform: 'compare',
        path: 'getEntries.response.status',
        match: 'ok',
      },
      failResponse: 'Response must be ok',
    },
    {
      condition: ['getEntries.response.data', { $transform: 'size' }],
      failResponse: {
        status: 'noaction',
        error: 'No data to set',
      },
      break: true,
    },
  ]
  const action = {
    getEntries: {
      response: { status: 'error', error: 'We got it wrong' },
    },
  }
  const expected = [
    [
      {
        status: 'badrequest',
        error: 'Response must be ok',
      },
      {
        status: 'noaction',
        error: 'No data to set',
      },
    ],
    true,
  ]

  const validator = prepareValidator(conditions, mapTransform, mapOptions)
  const ret = await validator(action)

  assert.deepEqual(ret, expected)
})

test('should return error response when validations fails without failResponse', async () => {
  const conditions = [
    {
      condition: ['getEntries.response.data', { $transform: 'size' }],
    },
  ]
  const action = {
    getEntries: {
      response: { status: 'ok', data: [] },
    },
  }
  const expected = [
    [
      {
        status: 'badrequest',
        error: 'Did not satisfy condition',
      },
    ],
    false,
  ]

  const validator = prepareValidator(conditions, mapTransform, mapOptions)
  const ret = await validator(action)

  assert.deepEqual(ret, expected)
})

test('should use given error status when validations fails without failResponse', async () => {
  const defaultErrorStatus = 'noaction'
  const conditions = [
    {
      condition: ['getEntries.response.data', { $transform: 'size' }],
    },
  ]
  const action = {
    getEntries: {
      response: { status: 'ok', data: [] },
    },
  }
  const expected = [
    [
      {
        status: 'noaction',
        error: 'Did not satisfy condition',
      },
    ],
    false,
  ]

  const validator = prepareValidator(
    conditions,
    mapTransform,
    mapOptions,
    defaultErrorStatus,
  )
  const ret = await validator(action)

  assert.deepEqual(ret, expected)
})

test('should return empty error arrays when validation is empty array', async () => {
  const conditions: ValidateObject[] = []
  const action = { type: 'GET', payload: { type: 'entry' } }
  const expected = [[], false]

  const validator = prepareValidator(conditions, mapTransform, mapOptions)
  const ret = await validator(action)

  assert.deepEqual(ret, expected)
})

test('should return empty error arrays when no validation', async () => {
  const conditions = undefined
  const action = { type: 'GET', payload: { type: 'entry' } }
  const expected = [[], false]

  const validator = prepareValidator(conditions, mapTransform, mapOptions)
  const ret = await validator(action)

  assert.deepEqual(ret, expected)
})

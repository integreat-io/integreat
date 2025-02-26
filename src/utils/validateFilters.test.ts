import test from 'node:test'
import assert from 'node:assert/strict'

import validateFilters from './validateFilters.js'

// Tests

test('should return empty array when filters are valid', () => {
  const filters = {
    'payload.data.draft': { const: false },
    'payload.data.title': { const: 'Entry 1' },
  }
  const data = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: false } },
  }

  const ret = validateFilters(filters)(data)

  assert.deepEqual(ret, [])
})

test('should return failing paths when filters are invalid', () => {
  const filters = {
    'payload.data.draft': { const: false },
    'payload.data.title': { const: 'Entry 1' },
  }
  const data = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  const ret = validateFilters(filters)(data)

  assert.deepEqual(ret, ['payload.data.draft'])
})

test('should return status noaction and friendly message when filters are invalid and no onFail', () => {
  const useFriendlyMessages = true
  const filters = {
    'payload.data.draft': { const: false },
    'payload.data.title': { const: 'Entry 1' },
  }
  const data = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  const ret = validateFilters(filters, useFriendlyMessages)(data)

  assert.deepEqual(ret, [
    {
      status: 'noaction',
      message: "'payload.data.draft' did not pass { const: false }",
    },
  ])
})

test('should return fail message and fail status when provided', () => {
  const useFriendlyMessages = true
  const filters = {
    'payload.data.draft': { const: false, onFail: "Can't be draft" },
    'payload.data.title': {
      const: 'Entry 1',
      onFail: { message: 'Should be Entry 1', status: 'noaction' },
    },
  }
  const data = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 2', draft: true } },
  }

  const ret = validateFilters(filters, useFriendlyMessages)(data)

  assert.deepEqual(ret, [
    { message: "Can't be draft", status: 'error' },
    { message: 'Should be Entry 1', status: 'noaction' },
  ])
})

test('should return generate friendlier message when only fail status is provided', () => {
  const useFriendlyMessages = true
  const filters = {
    'payload.data.draft': { const: false, onFail: { status: 'noaction' } },
    'payload.data.title': { const: 'Entry 1' },
  }
  const data = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  const ret = validateFilters(filters, useFriendlyMessages)(data)

  assert.deepEqual(ret, [
    {
      message: "'payload.data.draft' did not pass { const: false }",
      status: 'noaction',
    },
  ])
})

test('should return empty array when $or is true and one filter is valid', () => {
  const filters = {
    $or: true,
    'payload.data.draft': { const: false },
    'payload.data.title': { const: 'Entry 1' },
  }
  const data = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  const ret = validateFilters(filters)(data)

  assert.deepEqual(ret, [])
})

test('should return true when one filter in an $or object is valid', () => {
  const filters = {
    'payload.data.$type': { const: 'entry' },
    $or: {
      'payload.data.draft': { const: false },
      'payload.data.title': { const: 'Entry 1' },
    },
  }
  const data = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  const ret = validateFilters(filters)(data)

  assert.deepEqual(ret, [])
})

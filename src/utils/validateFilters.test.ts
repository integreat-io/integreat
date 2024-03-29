import test from 'ava'

import validateFilters from './validateFilters.js'

// Tests

test('should return empty array when filters are valid', (t) => {
  const filters = {
    'payload.data.draft': { const: false },
    'payload.data.title': { const: 'Entry 1' },
  }
  const data = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: false } },
  }

  const ret = validateFilters(filters)(data)

  t.deepEqual(ret, [])
})

test('should return failing paths when filters are invalid', (t) => {
  const filters = {
    'payload.data.draft': { const: false },
    'payload.data.title': { const: 'Entry 1' },
  }
  const data = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  const ret = validateFilters(filters)(data)

  t.deepEqual(ret, ['payload.data.draft'])
})

test('should return status noaction and friendly message when filters are invalid and no onFail', (t) => {
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

  t.deepEqual(ret, [
    {
      status: 'noaction',
      message: "'payload.data.draft' did not pass { const: false }",
    },
  ])
})

test('should return fail message and fail status when provided', (t) => {
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

  t.deepEqual(ret, [
    { message: "Can't be draft", status: 'error' },
    { message: 'Should be Entry 1', status: 'noaction' },
  ])
})

test('should return generate friendlier message when only fail status is provided', (t) => {
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

  t.deepEqual(ret, [
    {
      message: "'payload.data.draft' did not pass { const: false }",
      status: 'noaction',
    },
  ])
})

test('should return empty array when $or is true and one filter is valid', (t) => {
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

  t.deepEqual(ret, [])
})

test('should return true when one filter in an $or object is valid', (t) => {
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

  t.deepEqual(ret, [])
})

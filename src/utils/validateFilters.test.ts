import test from 'ava'

import validateFilters from './validateFilters'

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

test('should return error friendlier message when filters are invalid', (t) => {
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

  t.deepEqual(ret, ["'payload.data.draft' did not pass { const: false }"])
})

test('should return fail message when provided', (t) => {
  const useFriendlyMessages = true
  const filters = {
    'payload.data.draft': { const: false },
    'payload.data.title': {
      const: 'Entry 1',
      failMessage: 'Should be Entry 1',
    },
  }
  const data = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 2', draft: true } },
  }

  const ret = validateFilters(filters, useFriendlyMessages)(data)

  t.deepEqual(ret, [
    "'payload.data.draft' did not pass { const: false }",
    'Should be Entry 1',
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

import test from 'ava'

import validateFilters from './validateFilters'

// Tests

test('should return true when filters are valid', (t) => {
  const filters = {
    'payload.data.draft': { const: false },
    'payload.data.title': { const: 'Entry 1' },
  }
  const data = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: false } },
  }

  const ret = validateFilters(filters)(data)

  t.true(ret)
})

test('should return false when filters are invalid', (t) => {
  const filters = {
    'payload.data.draft': { const: false },
    'payload.data.title': { const: 'Entry 1' },
  }
  const data = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  const ret = validateFilters(filters)(data)

  t.false(ret)
})

test('should return true when or filters and one is valid', (t) => {
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

  t.true(ret)
})

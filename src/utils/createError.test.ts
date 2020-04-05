import test from 'ava'

import createError from './createError'

// Setup

const data = [{ id: 'ent1', $type: 'entry' }]

const exchange = {
  type: 'GET',
  status: null,
  request: { type: 'entry' },
  response: { data },
  meta: {},
}

// Tests

test('should create an error', (t) => {
  const message = 'An ugly error'
  const expected = {
    ...exchange,
    status: 'error',
    response: { error: 'An ugly error', data },
  }

  const ret = createError(exchange, message)

  t.deepEqual(ret, expected)
})

test('should create error with other status', (t) => {
  const message = 'Not found'
  const status = 'notfound'
  const expected = {
    ...exchange,
    status: 'notfound',
    response: { error: 'Not found', data },
  }

  const ret = createError(exchange, message, status)

  t.deepEqual(ret, expected)
})

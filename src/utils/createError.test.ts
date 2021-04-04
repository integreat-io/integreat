import test from 'ava'

import createError from './createError'

// Setup

const data = [{ id: 'ent1', $type: 'entry' }]

const action = {
  type: 'GET',
  payload: { type: 'entry' },
  response: { status: 'ok', data },
  meta: {},
}

// Tests

test('should create an error', (t) => {
  const message = 'An ugly error'
  const expected = {
    ...action,

    response: { status: 'error', error: 'An ugly error', data },
  }

  const ret = createError(action, message)

  t.deepEqual(ret, expected)
})

test('should create error with other status', (t) => {
  const message = 'Not found'
  const status = 'notfound'
  const expected = {
    ...action,
    response: { status: 'notfound', error: 'Not found', data },
  }

  const ret = createError(action, message, status)

  t.deepEqual(ret, expected)
})

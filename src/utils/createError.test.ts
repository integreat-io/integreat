import test from 'ava'

import { createErrorOnAction, createErrorResponse } from './createError'

// Setup

const data = [{ id: 'ent1', $type: 'entry' }]

const action = {
  type: 'GET',
  payload: { type: 'entry' },
  response: { status: 'ok', data },
  meta: {},
}

// Tests

test('should create an error response on action object', (t) => {
  const message = 'An ugly error'
  const expected = {
    ...action,
    response: { status: 'error', error: 'An ugly error', data },
  }

  const ret = createErrorOnAction(action, message)

  t.deepEqual(ret, expected)
})

test('should extract error message from Error', (t) => {
  const message = new Error('An ugly error')
  const expected = {
    ...action,
    response: { status: 'error', error: 'An ugly error', data },
  }

  const ret = createErrorOnAction(action, message)

  t.deepEqual(ret, expected)
})

test('should create error with other status', (t) => {
  const message = 'Not found'
  const status = 'notfound'
  const expected = {
    ...action,
    response: { status: 'notfound', error: 'Not found', data },
  }

  const ret = createErrorOnAction(action, message, status)

  t.deepEqual(ret, expected)
})

test('should create an error response', (t) => {
  const message = 'An ugly error'
  const expected = { status: 'error', error: 'An ugly error' }

  const ret = createErrorResponse(message)

  t.deepEqual(ret, expected)
})

test('should create an error response with other status', (t) => {
  const message = 'An ugly error'
  const status = 'notfound'
  const expected = { status: 'notfound', error: 'An ugly error' }

  const ret = createErrorResponse(message, status)

  t.deepEqual(ret, expected)
})

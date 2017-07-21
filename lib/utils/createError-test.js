import test from 'ava'

import createError from './createError'

test('should exist', (t) => {
  t.is(typeof createError, 'function')
})

test('should create an error', (t) => {
  const message = 'An ugly error'
  const expected = {
    status: 'error',
    error: 'An ugly error'
  }

  const ret = createError(message)

  t.deepEqual(ret, expected)
})

test('should create error with other status', (t) => {
  const message = 'Not found'
  const status = 'notfound'
  const expected = {
    status: 'notfound',
    error: 'Not found'
  }

  const ret = createError(message, status)

  t.deepEqual(ret, expected)
})

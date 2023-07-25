import test from 'ava'

import modifyOperationObject from './modifyOperationObject.js'

// Tests

test('should modify $cast operations to $transform', (t) => {
  const operation = { $cast: 'entry' }
  const expected = { $transform: Symbol.for('cast_entry') }

  const ret = modifyOperationObject(operation)

  t.deepEqual(ret, expected)
})

test('should keep other props', (t) => {
  const operation = { $cast: 'entry', $direction: 'to' }
  const expected = { $transform: Symbol.for('cast_entry'), $direction: 'to' }

  const ret = modifyOperationObject(operation)

  t.deepEqual(ret, expected)
})

test('should not touch regular operation objects', (t) => {
  const operation = { $transform: 'map', dictionary: 'userRole' }
  const expected = { $transform: 'map', dictionary: 'userRole' }

  const ret = modifyOperationObject(operation)

  t.deepEqual(ret, expected)
})

import test from 'ava'

import unwrapValue from './unwrapValue.js'

// Tests

test('should unwrap value', (t) => {
  const value = { $value: 'ent1' }
  const expected = 'ent1'

  const ret = unwrapValue(value)

  t.is(ret, expected)
})

test('should unwrap undefined value', (t) => {
  const value = { $value: undefined }
  const expected = undefined

  const ret = unwrapValue(value)

  t.is(ret, expected)
})

test('should unwrap null value', (t) => {
  const value = { $value: null }
  const expected = null

  const ret = unwrapValue(value)

  t.is(ret, expected)
})

test('should unwrap date value', (t) => {
  const theDate = new Date()
  const value = { $value: theDate }
  const expected = theDate

  const ret = unwrapValue(value)

  t.is(ret, expected)
})

test('should return value that is not wrapped', (t) => {
  const value = 'ent1'
  const expected = 'ent1'

  const ret = unwrapValue(value)

  t.is(ret, expected)
})

test('should not touch object that is not a wrapper', (t) => {
  const value = { id: 'ent1' }
  const expected = value

  const ret = unwrapValue(value)

  t.is(ret, expected)
})

test('should unwrap array of values', (t) => {
  const value = [{ $value: 'ent1' }, { $value: 3 }]
  const expected = ['ent1', 3]

  const ret = unwrapValue(value)

  t.deepEqual(ret, expected)
})

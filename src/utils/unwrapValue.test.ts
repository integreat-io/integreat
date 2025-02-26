import test from 'node:test'
import assert from 'node:assert/strict'

import unwrapValue from './unwrapValue.js'

// Tests

test('should unwrap value', () => {
  const value = { $value: 'ent1' }
  const expected = 'ent1'

  const ret = unwrapValue(value)

  assert.equal(ret, expected)
})

test('should unwrap undefined value', () => {
  const value = { $value: undefined }
  const expected = undefined

  const ret = unwrapValue(value)

  assert.equal(ret, expected)
})

test('should unwrap null value', () => {
  const value = { $value: null }
  const expected = null

  const ret = unwrapValue(value)

  assert.equal(ret, expected)
})

test('should unwrap date value', () => {
  const theDate = new Date()
  const value = { $value: theDate }
  const expected = theDate

  const ret = unwrapValue(value)

  assert.equal(ret, expected)
})

test('should return value that is not wrapped', () => {
  const value = 'ent1'
  const expected = 'ent1'

  const ret = unwrapValue(value)

  assert.equal(ret, expected)
})

test('should not touch object that is not a wrapper', () => {
  const value = { id: 'ent1' }
  const expected = value

  const ret = unwrapValue(value)

  assert.equal(ret, expected)
})

test('should unwrap array of values', () => {
  const value = [{ $value: 'ent1' }, { $value: 3 }]
  const expected = ['ent1', 3]

  const ret = unwrapValue(value)

  assert.deepEqual(ret, expected)
})

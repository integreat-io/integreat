import test from 'ava'

import valueMapper from './valueMapper'

// Tests

test('should exist', (t) => {
  t.is(typeof valueMapper, 'function')
})

test('should set key, type, and path', (t) => {
  const attr = valueMapper({key: 'id', type: 'integer', path: 'some.path'})

  t.is(attr.key, 'id')
  t.is(attr.type, 'integer')
  t.is(attr.path, 'some.path')
})

test('should set default attributes', (t) => {
  const attr = valueMapper()

  t.is(attr.key, null)
  t.is(attr.type, 'string')
  t.is(attr.path, null)
})

test('should use key as path when no path set', (t) => {
  const attr = valueMapper({key: 'id'})

  t.is(attr.path, 'id')
})

// Tests -- fromSource

test('fromSource should exist', (t) => {
  const attr = valueMapper()

  t.truthy(attr)
  t.is(typeof attr.fromSource, 'function')
})

test('fromSource should return value when no map', (t) => {
  const attr = valueMapper()

  const target = attr.fromSource('A value')

  t.is(target, 'A value')
})

test('fromSource should transform value with one transform function', (t) => {
  const transform = (value) => value.length
  const attr = valueMapper({transform})

  const target = attr.fromSource('value')

  t.is(target, 5)
})

test('fromSource should map with array of transform functions', (t) => {
  const transform = [
    (value) => value.length,
    {from: (value) => value + 1},
    (value) => 'Result: ' + value
  ]
  const attr = valueMapper({transform})

  const target = attr.fromSource('value')

  t.is(target, 'Result: 6')
})

test('fromSource should return null if no value is given', (t) => {
  const attr = valueMapper()

  const target = attr.fromSource(null)

  t.is(target, null)
})

// Tests -- toSource

test('toSource should exist', (t) => {
  const attr = valueMapper()

  t.is(typeof attr.toSource, 'function')
})

test('toSource should return value when no map', (t) => {
  const attr = valueMapper()

  const target = attr.toSource('A value')

  t.is(target, 'A value')
})

test('toSource should return default value', (t) => {
  const attr = valueMapper({defaultTo: 'default'})

  const target = attr.toSource()

  t.is(target, 'default')
})

test('toSource should not return default value', (t) => {
  const attr = valueMapper({defaultTo: 'default'})

  const target = attr.toSource('A value')

  t.is(target, 'A value')
})

test('fromSource should not treat empty string as no value', (t) => {
  const attr = valueMapper({defaultTo: 'default'})

  const target = attr.toSource('')

  t.is(target, '')
})

test('toSource should transform', (t) => {
  const transform = [
    {to: (value) => 'Length: ' + value},
    {to: (value) => value.length}
  ]
  const attr = valueMapper({transform})

  const target = attr.toSource('Value')

  t.is(target, 'Length: 5')
})

import test from 'ava'

import valueMapper from './valueMapper'

// Tests

test('should exist', (t) => {
  t.is(typeof valueMapper, 'function')
})

test('should set key, type, path, and param', (t) => {
  const attr = valueMapper({key: 'id', type: 'integer', path: 'some.path', param: 'param1'})

  t.is(attr.key, 'id')
  t.is(attr.type, 'integer')
  t.deepEqual(attr.path, ['some', 'path'])
  t.is(attr.param, 'param1')
})

test('should set default attributes', (t) => {
  const attr = valueMapper()

  t.is(attr.key, null)
  t.is(attr.type, 'string')
  t.deepEqual(attr.path, [])
})

test('should use `date` as default type for createdAt and updatedAt', (t) => {
  const createdAt = valueMapper({key: 'createdAt'})
  const updatedAt = valueMapper({key: 'updatedAt'})

  t.is(createdAt.type, 'date')
  t.is(updatedAt.type, 'date')
})

test('should use type as default type for relationship', (t) => {
  const relationship = valueMapper({key: 'user'}, {isRelationship: true})

  t.is(relationship.type, 'user')
})

test('should use key as path when no path set', (t) => {
  const attr = valueMapper({key: 'id'})

  t.deepEqual(attr.path, ['id'])
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

test('fromSource should return default value', (t) => {
  const attr = valueMapper({default: 'default'})

  const target = attr.fromSource()

  t.is(target, 'default')
})

test('fromSource should map with format pipeline', (t) => {
  const formatters = {
    length: (value) => value.length,
    plusOne: {from: (value) => value + 1}
  }
  const format = [
    'length',
    'plusOne',
    (value) => 'Result: ' + value,
    'unknown',
    null
  ]
  const attr = valueMapper({format}, {formatters})

  const ret = attr.fromSource('value')

  t.is(ret, 'Result: 6')
})

test('should add type to format pipeline for attributes', (t) => {
  const formatters = {string: () => 'A string'}
  const format = [() => 'Not type formatted']
  const attr = valueMapper({type: 'string', format}, {formatters})

  const ret = attr.fromSource('Value')

  t.is(ret, 'A string')
})

test('should not add type to format pipeline for relationships', (t) => {
  const formatters = {string: () => 'A string'}
  const format = [() => 'Not type formatted']
  const attr = valueMapper({type: 'string', format}, {formatters, isRelationship: true})

  const ret = attr.fromSource('Value')

  t.is(ret, 'Not type formatted')
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
  const attr = valueMapper({default: 'default'})

  const target = attr.toSource()

  t.is(target, 'default')
})

test('toSource should not return default value', (t) => {
  const attr = valueMapper({default: 'default'})

  const target = attr.toSource('A value')

  t.is(target, 'A value')
})

test('toSource should not treat empty string as no value', (t) => {
  const attr = valueMapper({default: 'default'})

  const target = attr.toSource('')

  t.is(target, '')
})

test('toSource should format', (t) => {
  const format = [
    {to: (value) => 'Length: ' + value},
    {to: (value) => value.length}
  ]
  const attr = valueMapper({format})

  const target = attr.toSource('Value')

  t.is(target, 'Length: 5')
})

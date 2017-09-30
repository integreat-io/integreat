import test from 'ava'

import valueMapper from './valueMapper'

// Tests

test('should exist', (t) => {
  t.is(typeof valueMapper, 'function')
})

test('should set key and type', (t) => {
  const attr = valueMapper({key: 'id', type: 'integer'})

  t.is(attr.key, 'id')
  t.is(attr.type, 'integer')
})

test('should set default attributes', (t) => {
  const attr = valueMapper()

  t.is(attr.key, null)
  t.is(attr.type, 'string')
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

// Tests -- fromSource

test('fromSource should exist', (t) => {
  const attr = valueMapper()

  t.truthy(attr)
  t.is(typeof attr.fromSource, 'function')
})

test('fromSource should return value when no maping', (t) => {
  const attr = valueMapper()

  const target = attr.fromSource('A value')

  t.is(target, 'A value')
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

test('fromSource should provide format function with original value', (t) => {
  const format = [
    (value) => 'Result: ' + value.length,
    (value, data) => `${value} (${data})`
  ]
  const attr = valueMapper({format})

  const ret = attr.fromSource('value')

  t.is(ret, 'Result: 5 (value)')
})

test('fromSource should return value from path', (t) => {
  const data = {title: 'The title'}
  const attr = valueMapper({path: 'title'})

  const target = attr.fromSource(data)

  t.is(target, 'The title')
})

test('fromSource should use key when no path', (t) => {
  const data = {title: 'The title'}
  const attr = valueMapper({key: 'title'})

  const target = attr.fromSource(data)

  t.is(target, 'The title')
})

test('fromSource should return undefined when no value found', (t) => {
  const format = [() => 'Formatted']
  const attr = valueMapper({path: 'title', format})

  const target = attr.fromSource({})

  t.is(target, undefined)
})

test('fromSource should return undefined for type attribute', (t) => {
  const attr = valueMapper({key: 'type'})
  const data = {type: 'entry'}

  const target = attr.fromSource(data)

  t.is(target, undefined)
})

test('fromSource should return value from params', (t) => {
  const params = {sourceId: 'entries'}
  const attr = valueMapper({param: 'sourceId'})

  const target = attr.fromSource({}, params)

  t.is(target, 'entries')
})

// Tests -- toSource

test('toSource should exist', (t) => {
  const attr = valueMapper()

  t.is(typeof attr.toSource, 'function')
})

test('toSource should return value according to path', (t) => {
  const attr = valueMapper({path: 'title'})
  const expected = {title: 'The title'}

  const target = attr.toSource('The title', {})

  t.deepEqual(target, expected)
})

test('toSource should return value when no map', (t) => {
  const attr = valueMapper()

  const target = attr.toSource('A value')

  t.is(target, 'A value')
})

test('toSource should return untouched object when no value', (t) => {
  const attr = valueMapper({path: 'title'})

  const target = attr.toSource()

  t.deepEqual(target, {})
})

test('toSource should not treat empty string as no value', (t) => {
  const attr = valueMapper({path: 'title'})
  const expected = {title: ''}

  const target = attr.toSource('')

  t.deepEqual(target, expected)
})

test('toSource should format', (t) => {
  const format = [
    {to: (value) => 'Length: ' + value},
    {to: (value) => value.length}
  ]
  const attr = valueMapper({path: 'title', format})
  const expected = {title: 'Length: 5'}

  const target = attr.toSource('Value')

  t.deepEqual(target, expected)
})

test('toSource should provide format function with original value', (t) => {
  const format = [
    {to: (value, data) => `${value} (${data})`},
    {to: (value) => 'Result: ' + value.length}
  ]
  const attr = valueMapper({path: 'title', format})
  const expected = {title: 'Result: 5 (Value)'}

  const target = attr.toSource('Value')

  t.deepEqual(target, expected)
})

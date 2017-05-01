import test from 'ava'

import Attribute from './attribute'

// Tests

test('should exist', (t) => {
  t.is(typeof Attribute, 'function')
})

test('should set key, type, path, default.from, and default.to', (t) => {
  const attr = new Attribute('id', 'integer', 'some.path', 'from', 'to')

  t.is(attr.key, 'id')
  t.is(attr.type, 'integer')
  t.is(attr.path, 'some.path')
  t.is(attr.default.from, 'from')
  t.is(attr.default.to, 'to')
})

test('should set default attributes', (t) => {
  const attr = new Attribute()

  t.is(attr.key, null)
  t.is(attr.type, 'string')
  t.is(attr.path, null)
  t.is(attr.default.from, null)
  t.is(attr.default.to, null)
  t.deepEqual(attr.map, [])
})

test('should accept 0 as a default value', (t) => {
  const attr = new Attribute(null, null, null, 0, 0)

  t.is(attr.default.from, 0)
  t.is(attr.default.to, 0)
})

test('should use key as path when no path set', (t) => {
  const attr = new Attribute('id')

  t.is(attr.path, 'id')
})

// Tests -- fromSource

test('fromSource should exist', (t) => {
  const attr = new Attribute()

  t.is(typeof attr.fromSource, 'function')
})

test('fromSource should return value', (t) => {
  const attr = new Attribute()

  const target = attr.fromSource('A value')

  t.is(target, 'A value')
})

test('fromSource should map value with one mapper', (t) => {
  const attr = new Attribute()
  const map = (value) => value.length
  attr.map.push(map)

  const target = attr.fromSource('value')

  t.is(target, 5)
})

test('fromSource should map with array of mappers', (t) => {
  const attr = new Attribute()
  const mappers = [
    (value) => value.length,
    {from: (value) => value + 1},
    (value) => 'Result: ' + value
  ]
  attr.map.push(...mappers)

  const target = attr.fromSource('value')

  t.is(target, 'Result: 6')
})

test('fromSource should return default value if no value is given', (t) => {
  const attr = new Attribute(null, null, null, 'default')

  const target = attr.fromSource(null)

  t.is(target, 'default')
})

test('fromSource should not return default value when value is given', (t) => {
  const attr = new Attribute(null, null, null, 'default')

  const target = attr.fromSource('value')

  t.is(target, 'value')
})

test('fromSource should not treat empty string as no value', (t) => {
  const attr = new Attribute(null, null, null, 'default')

  const target = attr.fromSource('')

  t.is(target, '')
})

test('fromSource should not map default value', (t) => {
  const attr = new Attribute(null, null, null, 'default')
  attr.map.push((value) => value + '.')

  const target = attr.fromSource(null)

  t.is(target, 'default')
})

// Tests -- toSource

test('toSource should exist', (t) => {
  const attr = new Attribute()

  t.is(typeof attr.toSource, 'function')
})

test('toSource should return untransformed value', (t) => {
  const attr = new Attribute()

  const target = attr.toSource('A value')

  t.is(target, 'A value')
})

test('toSource should return default value', (t) => {
  const attr = new Attribute(null, null, null, null, 'default')

  const target = attr.toSource(null)

  t.is(target, 'default')
})

test('toSource should not return default value', (t) => {
  const attr = new Attribute(null, null, null, null, 'default')

  const target = attr.toSource('A value')

  t.is(target, 'A value')
})

test('toSource should transform', (t) => {
  const attr = new Attribute(null, null, null, null, 'default')
  const mappers = [
    {to: (value) => 'Length: ' + value},
    {to: (value) => value.length}
  ]
  attr.map.push(...mappers)

  const target = attr.toSource('Value')

  t.is(target, 'Length: 5')
})

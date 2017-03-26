import test from 'ava'

import Attribute from './attribute'

// Tests

test('should exist', (t) => {
  t.is(typeof Attribute, 'function')
})

test('should set key, type, path, and defaultValue', (t) => {
  const attr = new Attribute('id', 'integer', 'some.path', 'default')

  t.is(attr.key, 'id')
  t.is(attr.type, 'integer')
  t.is(attr.path, 'some.path')
  t.is(attr.defaultValue, 'default')
})

test('should set default attributes', (t) => {
  const attr = new Attribute()

  t.is(attr.key, null)
  t.is(attr.type, 'string')
  t.is(attr.path, null)
  t.is(attr.defaultValue, null)
  t.deepEqual(attr.map, [])
})

test('should accept 0 as a default value', (t) => {
  const attr = new Attribute(null, null, null, 0)

  t.is(attr.defaultValue, 0)
})

// Tests -- mapAttribute

test('mapAttribute should exist', (t) => {
  const attr = new Attribute()

  t.is(typeof attr.mapAttribute, 'function')
})

test('mapAttribute should return value', (t) => {
  const attr = new Attribute()

  const target = attr.mapAttribute('A value')

  t.is(target, 'A value')
})

test('mapAttribute should map value with one mapper', (t) => {
  const attr = new Attribute()
  const map = (value) => value.length
  attr.map.push(map)

  const target = attr.mapAttribute('value')

  t.is(target, 5)
})

test('mapAttribute should map with array of mappers', (t) => {
  const attr = new Attribute()
  const mappers = [
    (value) => value.length,
    {from: (value) => value + 1},
    (value) => 'Result: ' + value
  ]
  attr.map.push(...mappers)

  const target = attr.mapAttribute('value')

  t.is(target, 'Result: 6')
})

test('mapAttribute should return default value if no value is given', (t) => {
  const attr = new Attribute(null, null, null, 'default')

  const target = attr.mapAttribute(null)

  t.is(target, 'default')
})

test('mapAttribute should not return default value when value is given', (t) => {
  const attr = new Attribute(null, null, null, 'default')

  const target = attr.mapAttribute('value')

  t.is(target, 'value')
})

test('mapAttribute should not treat empty string as no value', (t) => {
  const attr = new Attribute(null, null, null, 'default')

  const target = attr.mapAttribute('')

  t.is(target, '')
})

test('mapAttribute should not map default value', (t) => {
  const attr = new Attribute(null, null, null, 'default')
  attr.map.push((value) => value + '.')

  const target = attr.mapAttribute(null)

  t.is(target, 'default')
})

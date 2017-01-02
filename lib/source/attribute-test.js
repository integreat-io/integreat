import test from 'ava'

import Attribute from './attribute'

test('should exist', (t) => {
  t.is(typeof Attribute, 'function')
})

test('should have key', (t) => {
  const attr = new Attribute('id')

  t.is(attr.key, 'id')
})

test('should have null as default key', (t) => {
  const attr = new Attribute()

  t.is(attr.key, null)
})

test('should have type', (t) => {
  const attr = new Attribute(null, 'integer')

  t.is(attr.type, 'integer')
})

test('should have string as default type', (t) => {
  const attr = new Attribute()

  t.is(attr.type, 'string')
})

test('should have path', (t) => {
  const attr = new Attribute(null, null, 'some.path')

  t.is(attr.path, 'some.path')
})

test('should have null as default path', (t) => {
  const attr = new Attribute()

  t.is(attr.path, null)
})

test('should have defaultValue', (t) => {
  const attr = new Attribute(null, null, null, 'default')

  t.is(attr.defaultValue, 'default')
})

test('should have null as default defaultValue', (t) => {
  const attr = new Attribute()

  t.is(attr.defaultValue, null)
})

test('should accept 0 as a default value', (t) => {
  const attr = new Attribute(null, null, null, 0)

  t.is(attr.defaultValue, 0)
})

test('should have no map by default', (t) => {
  const attr = new Attribute()

  t.deepEqual(attr.map, [])
})

import test from 'ava'

import mapItem from './mapItem'

test('should exist', (t) => {
  t.is(typeof mapItem, 'function')
})

test('should return object with type and no attributes', (t) => {
  const item = {}
  const itemDef = {type: 'entry'}

  const ret = mapItem(item, itemDef)

  t.is(ret.type, 'entry')
  t.deepEqual(ret.attributes, {})
})

test('should use default type when none is supplied', (t) => {
  const item = {}

  const ret = mapItem(item)

  t.is(ret.type, 'item')
})

test('should return null when no item is given', (t) => {
  const ret = mapItem()

  t.is(ret, null)
})

test('should return defined attributes', (t) => {
  const item = {values: {first: 1, second: {value: 2}}}
  const attributes = {
    one: {path: 'values.first'},
    two: {path: 'values.second.value'}
  }
  const expected = {one: 1, two: 2}

  const ret = mapItem(item, {attributes})

  t.deepEqual(ret.attributes, expected)
})

test('should parse, transform, and format attributes', (t) => {
  const item = {value: 'value'}
  const attributes = {
    length: {
      path: 'value',
      parse: (value) => value.length,
      transform: (value) => value + 1,
      format: (value) => 'Less than ' + value
    }
  }
  const expected = {length: 'Less than 6'}

  const ret = mapItem(item, {attributes})

  t.deepEqual(ret.attributes, expected)
})

test('should use default value for attributes', (t) => {
  const item = {}
  const attributes = {some: {path: 'unknown', defaultValue: 'thing'}}
  const expected = {some: 'thing'}

  const ret = mapItem(item, {attributes})

  t.deepEqual(ret.attributes, expected)
})

test('should use null when no default value is set', (t) => {
  const item = {}
  const attributes = {some: {path: 'unknown'}}
  const expected = {some: null}

  const ret = mapItem(item, {attributes})

  t.deepEqual(ret.attributes, expected)
})

test('should not treat empty string in attribute as not set', (t) => {
  const item = {thing: ''}
  const attributes = {some: {path: 'thing'}}
  const expected = {some: ''}

  const ret = mapItem(item, {attributes})

  t.deepEqual(ret.attributes, expected)
})

test('should generate id', (t) => {
  const item = {}
  const itemDef = {}

  const ret1 = mapItem(item, itemDef)
  const ret2 = mapItem(item, itemDef)

  t.is(typeof ret1.id, 'string')
  t.not(ret1.id, ret2.id)
})

test('should use id attribute as id for item', (t) => {
  const item = {key: 'item1'}
  const attributes = {id: {path: 'key'}}

  const ret = mapItem(item, {attributes})

  t.is(ret.id, 'item1')
  t.is(ret.attributes.id, undefined)
})

test('should transform item', (t) => {
  const item = {number1: 3, number2: 2}
  const attributes = {one: {path: 'number1'}, two: {path: 'number2'}}
  const transform = (item) => Object.assign({}, item, {
    attributes: {
      sum: item.attributes.one + item.attributes.two
    }
  })

  const ret = mapItem(item, {attributes, transform})

  t.is(ret.attributes.sum, 5)
})

test('should filter item and return null', (t) => {
  const item = {text: 'Not this'}
  const attributes = {text: {path: 'text'}}
  const filter = (item) => item.attributes.text !== 'Not this'

  const ret = mapItem(item, {attributes, filter})

  t.is(ret, null)
})

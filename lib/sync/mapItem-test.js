import test from 'ava'

import mapItem from './mapItem'

// Tests

test('should exist', (t) => {
  t.is(typeof mapItem, 'function')
})

test('should return object with type and no attributes', (t) => {
  const item = {}

  const ret = mapItem(item, 'entry')

  t.is(ret.type, 'entry')
  t.deepEqual(ret.attributes, {})
})

test('should have defaultType', (t) => {
  t.is(mapItem.defaultType, 'unset')
})

test('should use default type when none is supplied', (t) => {
  const item = {}

  const ret = mapItem(item)

  t.is(ret.type, mapItem.defaultType)
})

test('should return null when no item is given', (t) => {
  const ret = mapItem()

  t.is(ret, null)
})

// Tests -- attributes

test('should return defined attributes', (t) => {
  const item = {values: {first: 1, second: {value: 2}}}
  const attributes = {
    one: {path: 'values.first'},
    two: {path: 'values.second.value'}
  }
  const expected = {one: 1, two: 2}

  const ret = mapItem(item, 'entry', attributes)

  t.deepEqual(ret.attributes, expected)
})

test('should map attributes with map pipeline', (t) => {
  const item = {value: 'value'}
  const pipeline = [
    (value) => value.length,
    {from: (value) => value + 1},
    (value) => 'Less than ' + value
  ]
  const attributes = {
    length: {
      path: 'value',
      map: pipeline
    }
  }
  const expected = {length: 'Less than 6'}

  const ret = mapItem(item, 'entry', attributes)

  t.deepEqual(ret.attributes, expected)
})

test('should use default value for attributes', (t) => {
  const item = {}
  const attributes = {some: {path: 'unknown', defaultValue: 'thing'}}
  const expected = {some: 'thing'}

  const ret = mapItem(item, 'entry', attributes)

  t.deepEqual(ret.attributes, expected)
})

test('should use null when no default value is set', (t) => {
  const item = {}
  const attributes = {some: {path: 'unknown'}}
  const expected = {some: null}

  const ret = mapItem(item, 'entry', attributes)

  t.deepEqual(ret.attributes, expected)
})

test('should not treat empty string in attribute as not set', (t) => {
  const item = {thing: ''}
  const attributes = {some: {path: 'thing'}}
  const expected = {some: ''}

  const ret = mapItem(item, 'entry', attributes)

  t.deepEqual(ret.attributes, expected)
})

test('should generate id', (t) => {
  const item = {}

  const ret1 = mapItem(item, 'entry', {})
  const ret2 = mapItem(item, 'entry', {})

  t.is(typeof ret1.id, 'string')
  t.not(ret1.id, ret2.id)
})

test('should use id attribute as id for item', (t) => {
  const item = {key: 'item1'}
  const attributes = {id: {path: 'key'}}

  const ret = mapItem(item, 'entry', attributes)

  t.is(ret.id, 'item1')
  t.is(ret.attributes.id, undefined)
})

test('should set createdAt and updatedAt to now when not specified', (t) => {
  const before = Date.now()

  const ret = mapItem({}, 'entry', {})

  const after = Date.now()
  t.true(ret.createdAt >= before)
  t.true(ret.createdAt <= after)
  t.is(ret.createdAt, ret.updatedAt)
})

test('should use createAt and updatedAt attributes as dates for item', (t) => {
  const createdAt = new Date('2016-11-01').getTime()
  const updatedAt = new Date('2016-11-13').getTime()
  const item = {createdAt, updatedAt}
  const attributes = {createdAt: {path: 'createdAt'}, updatedAt: {path: 'updatedAt'}}

  const ret = mapItem(item, 'entry', attributes)

  t.is(ret.createdAt, createdAt)
  t.is(ret.updatedAt, updatedAt)
  t.is(ret.attributes.createdAt, undefined)
  t.is(ret.attributes.updatedAt, undefined)
})

test('should use createdAt when updatedAt is not set', (t) => {
  const createdAt = new Date('2016-11-01').getTime()
  const item = {createdAt}
  const attributes = {createdAt: {path: 'createdAt'}}

  const ret = mapItem(item, 'entry', attributes)

  t.is(ret.updatedAt, createdAt)
})

// Tests -- transform item

test('should transform item', (t) => {
  const item = {number1: 3, number2: 2}
  const attributes = {one: {path: 'number1'}, two: {path: 'number2'}}
  const transform = (item) => Object.assign({}, item, {
    attributes: {
      sum: item.attributes.one + item.attributes.two
    }
  })

  const ret = mapItem(item, 'entry', attributes, transform)

  t.is(ret.attributes.sum, 5)
})

// Tests -- filter items

test('should filter item and return null', (t) => {
  const item = {text: 'Not this'}
  const attributes = {text: {path: 'text'}}
  const filter = (item) => item.attributes.text !== 'Not this'

  const ret = mapItem(item, 'entry', attributes, null, filter)

  t.is(ret, null)
})

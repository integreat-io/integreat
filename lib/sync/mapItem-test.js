import test from 'ava'
import Attribute from '../source/attribute'

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
  const attributes = [
    new Attribute('one', 'integer', 'values.first'),
    new Attribute('two', 'integer', 'values.second.value')
  ]
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
  const attributes = [new Attribute('length', 'string', 'value')]
  attributes[0].map = pipeline
  const expected = {length: 'Less than 6'}

  const ret = mapItem(item, 'entry', attributes)

  t.deepEqual(ret.attributes, expected)
})

test('should use default value for attributes', (t) => {
  const item = {}
  const attributes = [new Attribute('some', 'string', 'unknown', 'thing')]
  const expected = {some: 'thing'}

  const ret = mapItem(item, 'entry', attributes)

  t.deepEqual(ret.attributes, expected)
})

test('should use null when no default value is set', (t) => {
  const item = {}
  const attributes = [new Attribute('some', 'string', 'unknown')]
  const expected = {some: null}

  const ret = mapItem(item, 'entry', attributes)

  t.deepEqual(ret.attributes, expected)
})

test('should not treat empty string as not set in attribute', (t) => {
  const item = {thing: ''}
  const attributes = [new Attribute('some', 'string', 'thing')]
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
  const attributes = [new Attribute('id', 'string', 'key')]

  const ret = mapItem(item, 'entry', attributes)

  t.is(ret.id, 'item1')
  t.is(ret.attributes.id, undefined)
})

test('should set createdAt and updatedAt to now Date when not specified', (t) => {
  const before = Date.now()

  const ret = mapItem({}, 'entry', [])

  const after = Date.now()
  t.true(ret.createdAt.getTime() >= before)
  t.true(ret.createdAt.getTime() <= after)
  t.is(ret.createdAt.getTime(), ret.updatedAt.getTime())
})

test('should use createAt and updatedAt attributes as dates for item', (t) => {
  const createdAt = new Date('2016-11-01')
  const updatedAt = new Date('2016-11-13')
  const item = {createdAt, updatedAt}
  const attributes = [
    new Attribute('createdAt', 'date', 'createdAt'),
    new Attribute('updatedAt', 'date', 'updatedAt')
  ]

  const ret = mapItem(item, 'entry', attributes)

  t.is(ret.createdAt.getTime(), createdAt.getTime())
  t.is(ret.updatedAt.getTime(), updatedAt.getTime())
  t.is(ret.attributes.createdAt, undefined)
  t.is(ret.attributes.updatedAt, undefined)
})

test('should use createdAt when updatedAt is not set', (t) => {
  const createdAt = new Date('2016-11-01')
  const item = {createdAt}
  const attributes = [new Attribute('createdAt', 'date', 'createdAt')]

  const ret = mapItem(item, 'entry', attributes)

  t.is(ret.updatedAt.getTime(), createdAt.getTime())
})

// Tests -- map item

test('should map item with map function', (t) => {
  const item = {number1: 3, number2: 2}
  const attributes = [
    new Attribute('one', 'integer', 'number1'),
    new Attribute('two', 'integer', 'number2')
  ]
  const mapper = (item) => Object.assign({}, item, {
    attributes: {sum: item.attributes.one + item.attributes.two}
  })

  const ret = mapItem(item, 'entry', attributes, mapper)

  t.is(ret.attributes.sum, 5)
})

test('should map item with map object', (t) => {
  const item = {}
  const attributes = []
  const created = new Date('2016-11-04').getTime()
  const mapper = {
    from: (item) => Object.assign({}, item, {createdAt: created})
  }

  const ret = mapItem(item, 'entry', attributes, mapper)

  t.is(ret.createdAt, created)
})

test('should map item with map pipeline', (t) => {
  const item = {number1: 3, number2: 2}
  const attributes = [
    new Attribute('one', 'integer', 'number1'),
    new Attribute('two', 'integer', 'number2')
  ]
  const mappers = [
    (item) => Object.assign({}, item, {
      attributes: {sum: item.attributes.one + item.attributes.two}
    }),
    (item) => Object.assign({}, item, {attributes: {sum: item.attributes.sum}})
  ]

  const ret = mapItem(item, 'entry', attributes, mappers)

  t.is(ret.attributes.one, undefined)
  t.is(ret.attributes.two, undefined)
  t.is(ret.attributes.sum, 5)
})

// Tests -- filter items

test('should filter item and return null', (t) => {
  const item = {text: 'Not this'}
  const attributes = [new Attribute('text', 'string', 'text')]
  const filter = (item) => item.attributes.text !== 'Not this'

  const ret = mapItem(item, 'entry', attributes, null, filter)

  t.is(ret, null)
})

test('should filter item through the filter pipeline', (t) => {
  const item = {}
  const filters = [
    (item) => true,
    (item) => false
  ]

  const ret = mapItem(item, 'entry', [], null, filters)

  t.is(ret, null)
})

test('should filter item through the filter pipeline and pass', (t) => {
  const item = {}
  const filters = [
    (item) => true,
    (item) => true
  ]

  const ret = mapItem(item, 'entry', [], null, filters)

  t.truthy(ret)
  t.is(ret.type, 'entry')
})

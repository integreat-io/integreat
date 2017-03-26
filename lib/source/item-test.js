import test from 'ava'
import Attribute from './attribute'

import Item from './item'

test('should exist', (t) => {
  t.is(typeof Item, 'function')
})

test('should set type and path on creation', (t) => {
  const map = []
  const filter = []

  const item = new Item('entry', 'data', map, filter)

  t.is(item.type, 'entry')
  t.is(item.path, 'data')
})

test('should have defaultType', (t) => {
  t.is(Item.defaultType, 'unset')
})

test('should set default values', (t) => {
  const item = new Item()

  t.is(item.type, Item.defaultType)
  t.is(item.path, null)
  t.deepEqual(item.map, [])
  t.deepEqual(item.filter, [])
  t.deepEqual(item.attributes, [])
  t.deepEqual(item.relationships, [])
})

// Tests -- mapItem

test('mapItem should exist', (t) => {
  const item = new Item()

  t.is(typeof item.mapItem, 'function')
})

test('mapItem should return null for no source', (t) => {
  const item = new Item()

  const target = item.mapItem()

  t.is(target, null)
})

test('mapItem should return target with type', (t) => {
  const item = new Item('entry')

  const target = item.mapItem({})

  t.is(target.type, 'entry')
})

test('mapItem should generate random id', (t) => {
  const item = new Item()

  const target1 = item.mapItem({})
  const target2 = item.mapItem({})

  t.is(typeof target1.id, 'string')
  t.is(typeof target2.id, 'string')
  t.not(target1.id, target2.id)
})

test('mapItem should set createdAt and updatedAt to now Date when not specified', (t) => {
  const item = new Item()
  const before = Date.now()

  const target = item.mapItem({})

  const after = Date.now()
  t.true(target.createdAt.getTime() >= before)
  t.true(target.createdAt.getTime() <= after)
  t.is(target.createdAt.getTime(), target.updatedAt.getTime())
})

test('mapItem should set attributes', (t) => {
  const item = new Item('entry')
  const source = {values: {first: 1, second: {value: 2}}}
  const attributes = [
    new Attribute('one', 'integer', 'values.first'),
    new Attribute('two', 'integer', 'values.second.value')
  ]
  item.attributes.push(...attributes)

  const target = item.mapItem(source, 'entry', attributes)

  t.deepEqual(target.attributes, {one: 1, two: 2})
})

test('mapItem should use id attribute as id for item', (t) => {
  const item = new Item('entry')
  item.attributes.push(new Attribute('id', 'string', 'key'))
  const source = {key: 'item1'}

  const target = item.mapItem(source)

  t.is(target.id, 'item1')
  t.is(target.attributes.id, undefined)
})

test('mapItem should use createAt and updatedAt attributes as dates for item', (t) => {
  const item = new Item('entry')
  item.attributes.push(new Attribute('createdAt', 'date', 'createdAt'))
  item.attributes.push(new Attribute('updatedAt', 'date', 'updatedAt'))
  const createdAt = new Date('2016-11-01')
  const updatedAt = new Date('2016-11-13')
  const source = {createdAt, updatedAt}

  const target = item.mapItem(source)

  t.is(target.createdAt.getTime(), createdAt.getTime())
  t.is(target.updatedAt.getTime(), updatedAt.getTime())
  t.is(target.attributes.createdAt, undefined)
  t.is(target.attributes.updatedAt, undefined)
})

test('mapItem should use createdAt when updatedAt is not set', (t) => {
  const item = new Item('entry')
  item.attributes.push(new Attribute('createdAt', 'date', 'createdAt'))
  const createdAt = new Date('2016-11-01')
  const source = {createdAt}

  const target = item.mapItem(source)

  t.is(target.updatedAt.getTime(), createdAt.getTime())
})

test('mapItem should set relationships', (t) => {
  const item = new Item('entry')
  item.relationships.push(new Attribute('comments', 'comment', 'item.note'))
  const source = {item: {note: 'no1'}}

  const target = item.mapItem(source)

  t.truthy(target.relationships)
  t.deepEqual(target.relationships.comments, {id: 'no1', type: 'comment'})
})

test('mapItem should set relationship with array', (t) => {
  const item = new Item('entry')
  item.relationships.push(new Attribute('comments', 'comment', 'item.notes'))
  const source = {item: {notes: ['no1', 'no3']}}
  const expected = [{id: 'no1', type: 'comment'}, {id: 'no3', type: 'comment'}]

  const target = item.mapItem(source)

  t.deepEqual(target.relationships.comments, expected)
})

test('mapItem should use map pipeline', (t) => {
  const item = new Item('entry')
  item.attributes.push(new Attribute('id', null, 'id'))
  item.attributes.push(new Attribute('name', null, 'title'))
  item.map.push({
    from: (item) => Object.assign({}, item, {test1: 'First was here'})
  })
  item.map.push((item) => Object.assign({}, item, {
    attributes: Object.assign({}, item.attributes, {
      test2: 'Second too'
    })
  }))
  const source = {id: 'item1', title: 'First item'}

  const target = item.mapItem(source)

  t.is(target.test1, 'First was here')
  t.is(target.attributes.test2, 'Second too')
})

// Tests -- filterItem

test('filterItem should exist', (t) => {
  const item = new Item('entry')

  t.is(typeof item.filterItem, 'function')
})

test('filterItem should return true when no pipeline', (t) => {
  const item = new Item('entry')
  const source = {}

  const ret = item.filterItem(source)

  t.true(ret)
})

test('filterItem should filter through pipeline', (t) => {
  const item = new Item('entry')
  item.filter.push((item) => true)
  item.filter.push((item) => false)
  const source = {}

  const ret = item.filterItem(source)

  t.false(ret)
})

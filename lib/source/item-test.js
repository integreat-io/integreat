import test from 'ava'
import Attribute from './attribute'

import Item from './item'

test('should exist', (t) => {
  t.is(typeof Item, 'function')
})

test('should set type and path on creation', (t) => {
  const item = new Item('entry', 'data')

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
  t.deepEqual(item.filters.from, [])
  t.deepEqual(item.filters.to, [])
  t.deepEqual(item.attributes, [])
  t.deepEqual(item.relationships, [])
})

// Tests -- fromSource

test('fromSource should exist', (t) => {
  const item = new Item()

  t.is(typeof item.fromSource, 'function')
})

test('fromSource should return null for no source', (t) => {
  const item = new Item()

  const ret = item.fromSource()

  t.is(ret, null)
})

test('fromSource should return target with type', (t) => {
  const item = new Item('entry')

  const ret = item.fromSource({})

  t.is(ret.type, 'entry')
})

test('fromSource should generate random id', (t) => {
  const item = new Item()

  const ret1 = item.fromSource({})
  const ret2 = item.fromSource({})

  t.is(typeof ret1.id, 'string')
  t.is(typeof ret2.id, 'string')
  t.not(ret1.id, ret2.id)
})

test('fromSource should set createdAt and updatedAt to now Date when not specified', (t) => {
  const item = new Item()
  const before = Date.now()

  const ret = item.fromSource({})

  const after = Date.now()
  t.true(ret.createdAt.getTime() >= before)
  t.true(ret.createdAt.getTime() <= after)
  t.is(ret.createdAt.getTime(), ret.updatedAt.getTime())
})

test('fromSource should map attributes', (t) => {
  const data = {values: {first: 1, second: {value: 2}}}
  const item = new Item('entry')
  item.attributes.push(new Attribute('one', 'integer', 'values.first'))
  item.attributes.push(new Attribute('two', 'integer', 'values.second.value'))

  const ret = item.fromSource(data)

  t.deepEqual(ret.attributes, {one: 1, two: 2})
})

test('fromSource should use id attribute as id for item', (t) => {
  const data = {key: 'item1'}
  const item = new Item('entry')
  item.attributes.push(new Attribute('id', 'string', 'key'))

  const ret = item.fromSource(data)

  t.is(ret.id, 'item1')
  t.is(ret.attributes.id, undefined)
})

test('fromSource should not use source type as type for item', (t) => {
  const data = {key: 'item1', type: 'wrong'}
  const item = new Item('entry')
  item.attributes.push(new Attribute('type', 'string', 'type'))

  const ret = item.fromSource(data)

  t.is(ret.type, 'entry')
  t.is(ret.attributes.type, undefined)
})

test('fromSource should use createAt and updatedAt attributes as dates for item', (t) => {
  const createdAt = new Date('2016-11-01')
  const updatedAt = new Date('2016-11-13')
  const data = {createdAt, updatedAt}
  const item = new Item('entry')
  item.attributes.push(new Attribute('createdAt', 'date', 'createdAt'))
  item.attributes.push(new Attribute('updatedAt', 'date', 'updatedAt'))

  const ret = item.fromSource(data)

  t.is(ret.createdAt.getTime(), createdAt.getTime())
  t.is(ret.updatedAt.getTime(), updatedAt.getTime())
  t.is(ret.attributes.createdAt, undefined)
  t.is(ret.attributes.updatedAt, undefined)
})

test('fromSource should use createdAt when updatedAt is not set', (t) => {
  const createdAt = new Date('2016-11-01')
  const data = {createdAt}
  const item = new Item('entry')
  item.attributes.push(new Attribute('createdAt', 'date', 'createdAt'))

  const ret = item.fromSource(data)

  t.is(ret.updatedAt.getTime(), createdAt.getTime())
})

test('fromSource should set relationships', (t) => {
  const data = {item: {note: 'no1'}}
  const item = new Item('entry')
  item.relationships.push(new Attribute('comments', 'comment', 'item.note'))

  const ret = item.fromSource(data)

  t.truthy(ret.relationships)
  t.deepEqual(ret.relationships.comments, {id: 'no1', type: 'comment'})
})

test('fromSource should set relationship with array', (t) => {
  const data = {item: {notes: ['no1', 'no3']}}
  const item = new Item('entry')
  item.relationships.push(new Attribute('comments', 'comment', 'item.notes'))
  const expected = [{id: 'no1', type: 'comment'}, {id: 'no3', type: 'comment'}]

  const ret = item.fromSource(data)

  t.deepEqual(ret.relationships.comments, expected)
})

test('fromSource should use map pipeline', (t) => {
  const data = {id: 'item1', title: 'First item'}
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

  const ret = item.fromSource(data)

  t.is(ret.test1, 'First was here')
  t.is(ret.attributes.test2, 'Second too')
})

// Tests -- toSource

test('toSource should exist', (t) => {
  const item = new Item('entry')

  t.is(typeof item.toSource, 'function')
})

test('toSource should return null when no data', (t) => {
  const item = new Item()

  const ret = item.toSource()

  t.is(ret, null)
})

test('toSource should map attributes', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1, two: 2}}
  const item = new Item('entry')
  const attributes = [
    new Attribute('one', 'integer', 'values.first'),
    new Attribute('two', 'integer', 'values.second.value')
  ]
  item.attributes.push(...attributes)

  const ret = item.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.values, {first: 1, second: {value: 2}})
})

test('toSource should transform attributes', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1}}
  const item = new Item('entry')
  const attr = new Attribute('one', 'integer', 'values.first')
  attr.map.push({to: (value) => value + 2})
  item.attributes.push(attr)

  const ret = item.toSource(data)

  t.is(ret.values.first, 3)
})

test('toSource should not throw on missing attributes', (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const item = new Item('entry')
  item.attributes.push(new Attribute('one', 'integer', 'values.first'))

  t.notThrows(() => {
    item.toSource(data)
  })
})

test('toSource should map id', (t) => {
  const data = {id: 'item1', type: 'entry'}
  const item = new Item('entry')
  item.attributes.push(new Attribute('id', 'string', 'key'))

  const ret = item.toSource(data)

  t.is(ret.key, 'item1')
})

test('toSource should map type', (t) => {
  const data = {id: 'item1', type: 'entry'}
  const item = new Item('entry')
  item.attributes.push(new Attribute('type', 'string', 'type'))

  const ret = item.toSource(data)

  t.is(ret.type, 'entry')
})

test('toSource should map createdAt and updatedAt', (t) => {
  const createdAt = new Date('2016-11-01')
  const updatedAt = new Date('2016-11-13')
  const data = {id: 'item1', type: 'entry', createdAt, updatedAt}
  const item = new Item('entry')
  item.attributes.push(new Attribute('createdAt', 'date', 'createdDate'))
  item.attributes.push(new Attribute('updatedAt', 'date', 'updatedDate'))

  const ret = item.toSource(data)

  t.truthy(ret.createdDate)
  t.is(ret.createdDate.getTime(), createdAt.getTime())
  t.truthy(ret.updatedDate)
  t.is(ret.updatedDate.getTime(), updatedAt.getTime())
})

test('toSource should map relationships', (t) => {
  const data = {id: 'ent1', type: 'entry', relationships: {comments: {id: 'no1', type: 'comment'}}}
  const item = new Item('entry')
  item.relationships.push(new Attribute('comments', 'comment', 'item.note'))

  const ret = item.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.item, {note: 'no1'})
})

test('toSource should map relationships', (t) => {
  const data = {id: 'ent1', type: 'entry', relationships: {comments: {id: 'no1', type: 'comment'}}}
  const item = new Item('entry')
  item.relationships.push(new Attribute('comments', 'comment', 'item.note'))

  const ret = item.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.item, {note: 'no1'})
})

test('toSource should map relationships array', (t) => {
  const data = {
    id: 'ent1',
    type: 'entry',
    relationships: {comments: [
      {id: 'no1', type: 'comment'},
      {id: 'no3', type: 'comment'}
    ]}
  }
  const item = new Item('entry')
  item.relationships.push(new Attribute('comments', 'comment', 'item.notes'))

  const ret = item.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.item, {notes: ['no1', 'no3']})
})

test('toSource should transform relationships', (t) => {
  const data = {id: 'ent1', type: 'entry', relationships: {comments: {id: 'no1', type: 'comment'}}}
  const item = new Item('entry')
  const rel = new Attribute('comments', 'comment', 'item.note')
  rel.map.push({to: (value) => 'com_' + value})
  item.relationships.push(rel)

  const ret = item.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.item, {note: 'com_no1'})
})

test('toSource should not throw on missing relationships', (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const item = new Item('entry')
  item.relationships.push(new Attribute('comments', 'comment', 'item.note'))

  t.notThrows(() => {
    item.toSource(data)
  })
})

test('toSource should transform item', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1}}
  const item = new Item('entry')
  item.attributes.push(new Attribute('one', 'integer', 'values.first'))
  item.map.push({
    to: (item) => Object.assign({}, item, {title: 'First was here'})
  })

  const ret = item.toSource(data)

  t.truthy(ret)
  t.is(ret.title, 'First was here')
})

// Tests -- filterFromSource

test('filterFromSource should exist', (t) => {
  const item = new Item('entry')

  t.is(typeof item.filterFromSource, 'function')
})

test('filterFromSource should return true when no pipeline', (t) => {
  const item = new Item('entry')
  const source = {}

  const ret = item.filterFromSource(source)

  t.true(ret)
})

test('filterFromSource should filter through pipeline from source', (t) => {
  const item = new Item('entry')
  item.filters.from.push((item) => true)
  item.filters.from.push((item) => false)
  const source = {}

  const ret = item.filterFromSource(source)

  t.false(ret)
})

// Tests -- filterToSource

test('filterToSource should exist', (t) => {
  const item = new Item('entry')

  t.is(typeof item.filterToSource, 'function')
})

test('filterToSource should return true when no pipeline', (t) => {
  const item = new Item('entry')
  const data = {}

  const ret = item.filterToSource(data)

  t.true(ret)
})

test('filterToSource should filter through pipeline to source', (t) => {
  const item = new Item('entry')
  item.filters.to.push((item) => true)
  item.filters.to.push((item) => false)
  const data = {}

  const ret = item.filterToSource(data)

  t.false(ret)
})

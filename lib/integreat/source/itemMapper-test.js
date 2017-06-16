import test from 'ava'

import itemMapper from './itemMapper'

// Tests

test('should exist', (t) => {
  t.is(typeof itemMapper, 'function')
})

test('should set type and path', (t) => {
  const item = itemMapper({type: 'entry', path: 'data'})

  t.truthy(item)
  t.is(item.type, 'entry')
  t.is(item.path, 'data')
})

test('should set default values', (t) => {
  const item = itemMapper()

  t.is(item.type, 'unset')
  t.is(item.path, null)
})

// Tests -- fromSource

test('fromSource should exist', (t) => {
  const item = itemMapper()

  t.is(typeof item.fromSource, 'function')
})

test('fromSource should return null when no data', (t) => {
  const item = itemMapper()

  const ret = item.fromSource()

  t.is(ret, null)
})

test('fromSource should return item with type', (t) => {
  const item = itemMapper({type: 'entry'})

  const ret = item.fromSource({})

  t.truthy(ret)
  t.is(ret.type, 'entry')
})

test('fromSource should generate random id', (t) => {
  const item = itemMapper()

  const ret1 = item.fromSource({})
  const ret2 = item.fromSource({})

  t.is(typeof ret1.id, 'string')
  t.is(typeof ret2.id, 'string')
  t.not(ret1.id, ret2.id)
})

test('fromSource should set createdAt and updatedAt to current Date when not specified', (t) => {
  const item = itemMapper()
  const before = Date.now()

  const ret = item.fromSource({})

  const after = Date.now()
  t.truthy(ret.createdAt)
  t.true(ret.createdAt.getTime() >= before)
  t.true(ret.createdAt.getTime() <= after)
  t.is(ret.createdAt.getTime(), ret.updatedAt.getTime())
})

test('fromSource should map attributes', (t) => {
  const data = {values: {first: 1, second: {value: 2}}}
  const attributes = [
    {key: 'one', type: 'integer', path: 'values.first'},
    {key: 'two', type: 'integer', path: 'values.second.value'}
  ]
  const item = itemMapper({type: 'entry', attributes})

  const ret = item.fromSource(data)

  t.deepEqual(ret.attributes, {one: 1, two: 2})
})

test('fromSource should use id attribute as id for item', (t) => {
  const data = {key: 'item1'}
  const attributes = [{key: 'id', path: 'key'}]
  const item = itemMapper({type: 'entry', attributes})

  const ret = item.fromSource(data)

  t.is(ret.id, 'item1')
  t.is(ret.attributes.id, undefined)
})

test('fromSource should not use source type as type for item', (t) => {
  const data = {key: 'item1', type: 'wrong'}
  const attributes = [{key: 'type', path: 'type'}]
  const item = itemMapper({type: 'entry', attributes})

  const ret = item.fromSource(data)

  t.is(ret.type, 'entry')
  t.is(ret.attributes.type, undefined)
})

test('fromSource should use createAt and updatedAt attributes as dates for item', (t) => {
  const createdAt = new Date('2016-11-01')
  const updatedAt = new Date('2016-11-13')
  const data = {createdAt, updatedAt}
  const attributes = [
    {key: 'createdAt', type: 'date', path: 'createdAt'},
    {key: 'updatedAt', type: 'date', path: 'updatedAt'}
  ]
  const item = itemMapper({type: 'entry', attributes})

  const ret = item.fromSource(data)

  t.is(ret.createdAt.getTime(), createdAt.getTime())
  t.is(ret.updatedAt.getTime(), updatedAt.getTime())
  t.is(ret.attributes.createdAt, undefined)
  t.is(ret.attributes.updatedAt, undefined)
})

test('fromSource should use createdAt when updatedAt is not set', (t) => {
  const createdAt = new Date('2016-11-01')
  const data = {createdAt}
  const attributes = [{key: 'createdAt', type: 'date', path: 'createdAt'}]
  const item = itemMapper({type: 'entry', attributes})

  const ret = item.fromSource(data)

  t.is(ret.updatedAt.getTime(), createdAt.getTime())
})

test('fromSource should set relationships', (t) => {
  const data = {item: {note: 'no1'}}
  const relationships = [{key: 'comments', type: 'comment', path: 'item.note'}]
  const item = itemMapper({type: 'entry', relationships})

  const ret = item.fromSource(data)

  t.truthy(ret.relationships)
  t.deepEqual(ret.relationships.comments, {id: 'no1', type: 'comment'})
})

test('fromSource should set relationship with array', (t) => {
  const data = {item: {notes: ['no1', 'no3']}}
  const relationships = [{key: 'comments', type: 'comment', path: 'item.notes'}]
  const item = itemMapper({type: 'entry', relationships})
  const expected = [{id: 'no1', type: 'comment'}, {id: 'no3', type: 'comment'}]

  const ret = item.fromSource(data)

  t.deepEqual(ret.relationships.comments, expected)
})

test('fromSource should use map pipeline', (t) => {
  const data = {id: 'item1', title: 'First item'}
  const attributes = [
    {key: 'id'},
    {key: 'name', path: 'title'}
  ]
  const map = [
    {from: (item) => Object.assign({}, item, {test1: 'First was here'})},
    (item) => Object.assign({}, item, {
      attributes: Object.assign({}, item.attributes, {
        test2: 'Second too'
      })
    })
  ]
  const item = itemMapper({type: 'entry', attributes, map})

  const ret = item.fromSource(data)

  t.is(ret.test1, 'First was here')
  t.is(ret.attributes.test2, 'Second too')
})

// Tests -- toSource

test('toSource should exist', (t) => {
  const item = itemMapper({type: 'entry'})

  t.is(typeof item.toSource, 'function')
})

test('toSource should return null when no data', (t) => {
  const item = itemMapper()

  const ret = item.toSource()

  t.is(ret, null)
})

test('toSource should map attributes', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1, two: 2}}
  const attributes = [
    {key: 'one', type: 'integer', path: 'values.first'},
    {key: 'two', type: 'integer', path: 'values.second.value'}
  ]
  const item = itemMapper({type: 'entry', attributes})

  const ret = item.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.values, {first: 1, second: {value: 2}})
})

test('toSource should transform attributes', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1}}
  const transform = [{to: (value) => value + 2}]
  const attributes = [{key: 'one', type: 'integer', path: 'values.first', transform}]
  const item = itemMapper({type: 'entry', attributes})

  const ret = item.toSource(data)

  t.is(ret.values.first, 3)
})

test('toSource should not throw on missing attributes', (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const attributes = [{key: 'one', type: 'integer', path: 'values.first'}]
  const item = itemMapper({type: 'entry', attributes})

  t.notThrows(() => {
    item.toSource(data)
  })
})

test('toSource should map id', (t) => {
  const data = {id: 'item1', type: 'entry'}
  const attributes = [{key: 'id', type: 'string', path: 'key'}]
  const item = itemMapper({type: 'entry', attributes})

  const ret = item.toSource(data)

  t.is(ret.key, 'item1')
})

test('toSource should map type', (t) => {
  const data = {id: 'item1', type: 'entry'}
  const attributes = [{key: 'type', type: 'string', path: 'type'}]
  const item = itemMapper({type: 'entry', attributes})

  const ret = item.toSource(data)

  t.is(ret.type, 'entry')
})

test('toSource should map createdAt and updatedAt', (t) => {
  const createdAt = new Date('2016-11-01')
  const updatedAt = new Date('2016-11-13')
  const data = {id: 'item1', type: 'entry', createdAt, updatedAt}
  const attributes = [
    {key: 'createdAt', type: 'date', path: 'createdDate'},
    {key: 'updatedAt', type: 'date', path: 'updatedDate'}
  ]
  const item = itemMapper({type: 'entry', attributes})

  const ret = item.toSource(data)

  t.truthy(ret.createdDate)
  t.is(ret.createdDate.getTime(), createdAt.getTime())
  t.truthy(ret.updatedDate)
  t.is(ret.updatedDate.getTime(), updatedAt.getTime())
})

test('toSource should map relationships', (t) => {
  const data = {id: 'ent1', type: 'entry', relationships: {comments: {id: 'no1', type: 'comment'}}}
  const relationships = [{key: 'comments', type: 'comment', path: 'item.note'}]
  const item = itemMapper({type: 'entry', relationships})

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
  const relationships = [{key: 'comments', type: 'comment', path: 'item.notes'}]
  const item = itemMapper({type: 'entry', relationships})

  const ret = item.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.item, {notes: ['no1', 'no3']})
})

test('toSource should transform relationships', (t) => {
  const data = {id: 'ent1', type: 'entry', relationships: {comments: {id: 'no1', type: 'comment'}}}
  const transform = [{to: (value) => 'com_' + value}]
  const relationships = [{key: 'comments', type: 'comment', path: 'item.note', transform}]
  const item = itemMapper({type: 'entry', relationships})

  const ret = item.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.item, {note: 'com_no1'})
})

test('toSource should not throw on missing relationships', (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const relationships = [{key: 'comments', type: 'comment', path: 'item.note'}]
  const item = itemMapper({type: 'entry', relationships})

  t.notThrows(() => {
    item.toSource(data)
  })
})

test('toSource should transform item', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1}}
  const attributes = [{key: 'one', type: 'integer', path: 'values.first'}]
  const map = [{to: (item) => Object.assign({}, item, {title: 'First was here'})}]
  const item = itemMapper({type: 'entry', attributes, map})

  const ret = item.toSource(data)

  t.truthy(ret)
  t.is(ret.title, 'First was here')
})

// Tests -- filterFromSource

test('filterFromSource should exist', (t) => {
  const item = itemMapper({type: 'entry'})

  t.is(typeof item.filterFromSource, 'function')
})

test('filterFromSource should return true when no pipeline', (t) => {
  const data = {}
  const item = itemMapper({type: 'entry'})

  const ret = item.filterFromSource(data)

  t.true(ret)
})

test('filterFromSource should filter through pipeline from source', (t) => {
  const data = {}
  const filterFrom = [
    (item) => true,
    (item) => false
  ]
  const item = itemMapper({type: 'entry', filterFrom})

  const ret = item.filterFromSource(data)

  t.false(ret)
})

// Tests -- filterToSource

test('filterToSource should exist', (t) => {
  const item = itemMapper({type: 'entry'})

  t.is(typeof item.filterToSource, 'function')
})

test('filterToSource should return true when no pipeline', (t) => {
  const data = {}
  const item = itemMapper({key: 'entry'})

  const ret = item.filterToSource(data)

  t.true(ret)
})

test('filterToSource should filter through pipeline to source', (t) => {
  const data = {}
  const filterTo = [
    (item) => true,
    (item) => false
  ]
  const item = itemMapper({key: 'entry', filterTo})

  const ret = item.filterToSource(data)

  t.false(ret)
})

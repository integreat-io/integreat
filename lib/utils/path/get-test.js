import test from 'ava'

import get from './get'

const object = {
  data: {
    items: [
      {id: 'item1', title: 'Item 1', tags: ['one', 'odd'], active: true},
      {id: 'item2', title: 'Item 2', tags: ['two', 'even'], active: false},
      {id: 'item3', title: 'Item 3', tags: ['three', 'odd']},
      {id: 'item4', title: 'Item 4', tags: ['four', 'even'], active: true}
    ]
  },
  meta: {
    author: 'Someone',
    tags: []
  },
  list: [{id: 'no1'}, {id: 'no2'}, {id: 'no3'}]
}

test('should exist', (t) => {
  t.is(typeof get, 'function')
})

test('should get object on no path', (t) => {
  const path = null

  const ret = get(object, path)

  t.deepEqual(ret, object)
})

test('should get object on empty path', (t) => {
  const path = []

  const ret = get(object, path)

  t.deepEqual(ret, object)
})

test('should get meta.author', (t) => {
  const path = ['meta', 'author']

  const ret = get(object, path)

  t.is(ret, 'Someone')
})

test('should return undefined when prop missing', (t) => {
  const path = ['meta', 'unknown']

  const ret = get(object, path)

  t.is(ret, undefined)
})

test('should return undefined when first part of path i missing', (t) => {
  const path = ['unknown', 'author']

  const ret = get(object, path)

  t.is(ret, undefined)
})

test('should return default value when prop missing', (t) => {
  const path = ['meta', 'unknown']

  const ret = get(object, path, 'The default')

  t.is(ret, 'The default')
})

test('should get data.items[]', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}]

  const ret = get(object, path)

  t.true(Array.isArray(ret))
  t.is(ret.length, 4)
  t.is(ret[0].id, 'item1')
})

test('should get meta.tags[]', (t) => {
  const path = ['meta', {prop: 'tags', type: 'all', spread: true}]

  const ret = get(object, path)

  t.deepEqual(ret, [])
})

test('should get list[]', (t) => {
  const path = [{prop: 'list', type: 'all', spread: true}]

  const ret = get(object, path)

  t.true(Array.isArray(ret))
  t.is(ret.length, 3)
  t.is(ret[0].id, 'no1')
})

test('should return undefined when not array', (t) => {
  const path = ['data', {prop: 'list', type: 'all'}]

  const ret = get(object, path)

  t.is(ret, undefined)
})

test('should get data.items[].title', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}, 'title']
  const expected = ['Item 1', 'Item 2', 'Item 3', 'Item 4']

  const ret = get(object, path)

  t.deepEqual(ret, expected)
})

test('should return undefined when prop missing after array', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}, 'unknown']

  const ret = get(object, path)

  t.is(ret, undefined)
})

test('should return only defined values', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}, 'active']
  const expected = [true, false, true]

  const ret = get(object, path)

  t.deepEqual(ret, expected)
})

test('should return default value for undefined values after array', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}, 'active']
  const expected = [true, false, false, true]

  const ret = get(object, path, false)

  t.deepEqual(ret, expected)
})

test('should get data.items[1].title', (t) => {
  const path = ['data', {prop: 'items', type: 'one', index: 1}, 'title']

  const ret = get(object, path)

  t.is(ret, 'Item 2')
})

test('should get data.items[1:3].title', (t) => {
  const path = ['data', {prop: 'items', type: 'range', begin: 1, end: 3, spread: true}, 'title']
  const expected = ['Item 2', 'Item 3']

  const ret = get(object, path)

  t.deepEqual(ret, expected)
})

test('should get data.items[1:].title', (t) => {
  const path = ['data', {prop: 'items', type: 'range', begin: 1, spread: true}, 'title']
  const expected = ['Item 2', 'Item 3', 'Item 4']

  const ret = get(object, path)

  t.deepEqual(ret, expected)
})

test('should get data.items[:2].title', (t) => {
  const path = ['data', {prop: 'items', type: 'range', end: 2, spread: true}, 'title']
  const expected = ['Item 1', 'Item 2']

  const ret = get(object, path)

  t.deepEqual(ret, expected)
})

test('should get data.items[-1].title', (t) => {
  const path = ['data', {prop: 'items', type: 'one', index: -1}, 'title']

  const ret = get(object, path)

  t.is(ret, 'Item 4')
})

test('should get data.items[-3:-2].title', (t) => {
  const path = ['data', {prop: 'items', type: 'range', begin: -3, end: -1, spread: true}, 'title']
  const expected = ['Item 2', 'Item 3']

  const ret = get(object, path)

  t.deepEqual(ret, expected)
})

test('should get data.items[0].tags[0]', (t) => {
  const path = ['data', {prop: 'items', type: 'one', index: 0}, {prop: 'tags', type: 'one', index: 0}]

  const ret = get(object, path)

  t.is(ret, 'one')
})

test('should get data.items[].tags[0]', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}, {prop: 'tags', type: 'one', index: 0, sub: true}]
  const expected = ['one', 'two', 'three', 'four']

  const ret = get(object, path)

  t.deepEqual(ret, expected)
})

test('should get data.items[].tags[]', (t) => {
  const path = ['data', {prop: 'items', type: 'all'}, {prop: 'tags', type: 'all', sub: true, spread: true}]
  const expected = ['one', 'odd', 'two', 'even', 'three', 'odd', 'four', 'even']

  const ret = get(object, path)

  t.deepEqual(ret, expected)
})

test('should get data.items[id="item1"].title', (t) => {
  const path = ['data', {prop: 'items', type: 'filter', path: ['id'], value: 'item1', spread: true}, 'title']
  const expected = ['Item 1']

  const ret = get(object, path)

  t.deepEqual(ret, expected)
})

test('should get data.items[tags[]="odd"]', (t) => {
  const path = ['data', {prop: 'items', type: 'filter', path: [{prop: 'tags', type: 'all'}], value: 'odd', spread: true}]

  const ret = get(object, path)

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'item1')
  t.is(ret[1].id, 'item3')
})

test('should get alternative', (t) => {
  const path = ['meta', 'superauthor']
  path.alternative = ['meta', 'author']

  const ret = get(object, path)

  t.is(ret, 'Someone')
})

import test from 'ava'

import compile from './compile'

test('should exist', (t) => {
  t.is(typeof compile, 'function')
})

test('should return empty array on no path', (t) => {
  const expected = []

  const ret = compile(null)

  t.deepEqual(ret, expected)
})

test('should return empty array on empty path', (t) => {
  const expected = []

  const ret = compile('')

  t.deepEqual(ret, expected)
})

test('should compile meta.author', (t) => {
  const path = 'meta.author'
  const expected = ['meta', 'author']

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile meta.date\\.created', (t) => {
  const path = 'meta.date\\.created'
  const expected = ['meta', 'date.created']

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile items[]', (t) => {
  const path = 'items[]'
  const expected = [{prop: 'items', type: 'all', spread: true}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[]', (t) => {
  const path = 'data.items[]'
  const expected = ['data', {prop: 'items', type: 'all', spread: true}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[].title', (t) => {
  const path = 'data.items[].title'
  const expected = ['data', {prop: 'items', type: 'all', spread: true}, 'title']

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[1]', (t) => {
  const path = 'data.items[1]'
  const expected = ['data', {prop: 'items', type: 'one', index: 1}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[-1]', (t) => {
  const path = 'data.items[-1]'
  const expected = ['data', {prop: 'items', type: 'one', index: -1}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should throw on data.items[a]', (t) => {
  const path = 'data.items[a]'

  t.throws(() => {
    compile(path)
  })
})

test('should compile data.items[1:3].title', (t) => {
  const path = 'data.items[1:3].title'
  const expected = ['data', {prop: 'items', type: 'range', begin: 1, end: 3, spread: true}, 'title']

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should throw on data.items[a:b]', (t) => {
  const path = 'data.items[a:b]'

  t.throws(() => {
    compile(path)
  })
})

test('should compile data.items[1:-3].title', (t) => {
  const path = 'data.items[1:-3].title'
  const expected = ['data', {prop: 'items', type: 'range', begin: 1, end: -3, spread: true}, 'title']

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[1:].title', (t) => {
  const path = 'data.items[1:].title'
  const expected = ['data', {prop: 'items', type: 'range', begin: 1, spread: true}, 'title']

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[:2].title', (t) => {
  const path = 'data.items[:2].title'
  const expected = ['data', {prop: 'items', type: 'range', end: 2, spread: true}, 'title']

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[0].tags[0]', (t) => {
  const path = 'data.items[0].tags[0]'
  const expected = ['data', {prop: 'items', type: 'one', index: 0}, {prop: 'tags', type: 'one', index: 0}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[].tags[0]', (t) => {
  const path = 'data.items[].tags[0]'
  const expected = ['data', {prop: 'items', type: 'all', spread: true}, {prop: 'tags', type: 'one', index: 0, sub: true}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[].tags[]', (t) => {
  const path = 'data.items[].tags[]'
  const expected = ['data', {prop: 'items', type: 'all'}, {prop: 'tags', type: 'all', sub: true, spread: true}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[*].tags[]', (t) => {
  const path = 'data.items[*].tags[]'
  const expected = ['data', {prop: 'items', type: 'all', spread: true}, {prop: 'tags', type: 'all', sub: true}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[meta.tags[]="odd"]', (t) => {
  const path = 'data.items[meta.tags[]="odd"]'
  const expected = [
    'data',
    {prop: 'items', type: 'filter', path: ['meta', {prop: 'tags', type: 'all', spread: true}], operator: '=', value: 'odd', spread: true}
  ]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[type^="image"]', (t) => {
  const path = 'data.items[type^="image"]'
  const expected = [
    'data',
    {prop: 'items', type: 'filter', path: ['type'], value: 'image', operator: '^=', spread: true}
  ]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[type$="jpg"]', (t) => {
  const path = 'data.items[type$="jpg"]'
  const expected = [
    'data',
    {prop: 'items', type: 'filter', path: ['type'], value: 'jpg', operator: '$=', spread: true}
  ]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile alternative paths', (t) => {
  const path = ['meta.author', 'meta.writer', 'owner']

  const ret = compile(path)

  const alt1 = ret.alternative
  t.true(Array.isArray(alt1))
  t.is(alt1.length, 2)
  const alt2 = alt1.alternative
  t.true(Array.isArray(alt2))
  t.is(alt2.length, 1)
})

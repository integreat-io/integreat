import test from 'ava'

import compile from './compile'

test('should exist', (t) => {
  t.is(typeof compile, 'function')
})

test('should return null on no path', (t) => {
  const ret = compile(null)

  t.is(ret, null)
})

test('should return null on empty path', (t) => {
  const ret = compile('')

  t.is(ret, null)
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
  const expected = [{prop: 'items', type: 'all', sub: false, spread: true}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[]', (t) => {
  const path = 'data.items[]'
  const expected = ['data', {prop: 'items', type: 'all', sub: false, spread: true}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[].title', (t) => {
  const path = 'data.items[].title'
  const expected = ['data', {prop: 'items', type: 'all', sub: false, spread: true}, 'title']

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile []', (t) => {
  const path = '[]'
  const expected = [{prop: null, type: 'all', sub: false, spread: true}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[1]', (t) => {
  const path = 'data.items[1]'
  const expected = ['data', {prop: 'items', type: 'one', sub: false, index: 1}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[-1]', (t) => {
  const path = 'data.items[-1]'
  const expected = ['data', {prop: 'items', type: 'one', sub: false, index: -1}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.item[keys]', (t) => {
  const path = 'data.item[keys]'
  const expected = ['data', {prop: 'item', type: 'keys', sub: false}]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.item[values]', (t) => {
  const path = 'data.item[values]'
  const expected = ['data', {prop: 'item', type: 'values', sub: false}]

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
  const expected = ['data', {prop: 'items', type: 'range', sub: false, begin: 1, end: 3, spread: true}, 'title']

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
  const expected = ['data', {prop: 'items', type: 'range', sub: false, begin: 1, end: -3, spread: true}, 'title']

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[1:].title', (t) => {
  const path = 'data.items[1:].title'
  const expected = ['data', {prop: 'items', type: 'range', sub: false, begin: 1, spread: true}, 'title']

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[:2].title', (t) => {
  const path = 'data.items[:2].title'
  const expected = ['data', {prop: 'items', type: 'range', sub: false, end: 2, spread: true}, 'title']

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[0].tags[0]', (t) => {
  const path = 'data.items[0].tags[0]'
  const expected = [
    'data',
    {prop: 'items', type: 'one', sub: false, index: 0},
    {prop: 'tags', type: 'one', sub: false, index: 0}
  ]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[].tags[0]', (t) => {
  const path = 'data.items[].tags[0]'
  const expected = [
    'data',
    {prop: 'items', type: 'all', spread: true, sub: false},
    {prop: 'tags', type: 'one', index: 0, sub: true}
  ]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[].tags[]', (t) => {
  const path = 'data.items[].tags[]'
  const expected = [
    'data',
    {prop: 'items', type: 'all', sub: false},
    {prop: 'tags', type: 'all', sub: true, spread: true}
  ]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[*].tags[]', (t) => {
  const path = 'data.items[*].tags[]'
  const expected = [
    'data',
    {prop: 'items', type: 'all', spread: true, sub: false},
    {prop: 'tags', type: 'all', sub: true}
  ]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[meta.tags[]="odd"]', (t) => {
  const path = 'data.items[meta.tags[]="odd"]'
  const expected = [
    'data',
    {
      prop: 'items',
      type: 'filter',
      sub: false,
      path: ['meta', {prop: 'tags', type: 'all', sub: false, spread: true}],
      operator: '=',
      value: 'odd',
      spread: true
    }
  ]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[type^="image"]', (t) => {
  const path = 'data.items[type^="image"]'
  const expected = [
    'data',
    {
      prop: 'items',
      type: 'filter',
      path: ['type'],
      value: 'image',
      operator: '^=',
      sub: false,
      spread: true
    }
  ]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile data.items[type$="jpg"]', (t) => {
  const path = 'data.items[type$="jpg"]'
  const expected = [
    'data',
    {
      prop: 'items',
      type: 'filter',
      path: ['type'],
      value: 'jpg',
      operator: '$=',
      sub: false,
      spread: true
    }
  ]

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile alternative paths', (t) => {
  const path = ['meta.author', 'meta.writer', 'owner']

  const ret = compile(path)

  const next1 = ret.next
  t.true(Array.isArray(next1))
  t.is(next1.length, 2)
  const next2 = next1.next
  t.true(Array.isArray(next2))
  t.is(next2.length, 1)
})

test('should compile meta.author="Someone"', (t) => {
  const path = 'meta.author="Someone"'
  const expected = {path: ['meta', 'author'], operator: '=', value: 'Someone'}

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile meta.author^="Some"', (t) => {
  const path = 'meta.author^="Some"'
  const expected = {path: ['meta', 'author'], operator: '^=', value: 'Some'}

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile meta.author$="one"', (t) => {
  const path = 'meta.author$="one"'
  const expected = {path: ['meta', 'author'], operator: '$=', value: 'one'}

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile meta.tags[]="news"', (t) => {
  const path = 'meta.tags[]="news"'
  const expected = {
    path: ['meta', {prop: 'tags', type: 'all', sub: false, spread: true}],
    operator: '=',
    value: 'news'
  }

  const ret = compile(path)

  t.deepEqual(ret, expected)
})

test('should compile alternative predicates', (t) => {
  const path = ['meta.tags[]="news"', 'meta.author="Someone"']
  const expected = {path: ['meta', 'author'], operator: '=', value: 'Someone'}

  const ret = compile(path)

  t.deepEqual(ret.next, expected)
})

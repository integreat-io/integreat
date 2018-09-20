import test from 'ava'

import compare from './compare'

// Helpers

const object = {
  meta: {
    author: 'Someone',
    tags: []
  },
  list: [{ id: 'no1' }, { id: 'no2' }, { id: 'no3' }]
}

// Tests

test('should exist', (t) => {
  t.is(typeof compare, 'function')
})

test('should return true when no path', (t) => {
  const path = null

  const ret = compare(object, path)

  t.true(ret)
})

test('should return true when empty path', (t) => {
  const path = []

  const ret = compare(object, path)

  t.true(ret)
})

test('should return false when no object', (t) => {
  const path = { path: ['meta', 'author'], operator: '=', value: 'Someone' }

  const ret = compare(null, path)

  t.false(ret)
})

test('should compare meta.author="Someone"', (t) => {
  const path = { path: ['meta', 'author'], operator: '=', value: 'Someone' }

  const ret = compare(object, path)

  t.true(ret)
})

test('should compare list[].id="no2"', (t) => {
  const path = { path: [{ prop: 'list', type: 'all', spread: true }, 'id'], operator: '=', value: 'no2' }

  const ret = compare(object, path)

  t.true(ret)
})

test('should compare list[].id="no4"', (t) => {
  const path = { path: [{ prop: 'list', type: 'all', spread: true }, 'id'], operator: '=', value: 'no4' }

  const ret = compare(object, path)

  t.false(ret)
})

test('should compare meta.unknown="Something"', (t) => {
  const path = { path: ['meta', 'unknown'], operator: '=', value: 'Something' }

  const ret = compare(object, path)

  t.false(ret)
})

test('should compare meta.author', (t) => {
  const path = ['meta', 'author']

  const ret = compare(object, path)

  t.true(ret)
})

test('should compare with several paths', (t) => {
  const path = { path: [{ prop: 'list', type: 'all', spread: true }, 'id'], operator: '=', value: 'no2' }
  path.next = { path: [{ prop: 'list', type: 'all', spread: true }, 'id'], operator: '=', value: 'no4' }

  const ret = compare(object, path)

  t.false(ret)
})

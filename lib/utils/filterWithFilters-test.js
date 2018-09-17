import test from 'ava'

import filterWithFilters from './filterWithFilters'

test('should exist', (t) => {
  t.is(typeof filterWithFilters, 'function')
})

test('should return true when no filters', (t) => {
  const item = {}

  const ret = filterWithFilters(item)

  t.true(ret)
})

test('should return true when no filters in array', (t) => {
  const item = {}
  const filters = []

  const ret = filterWithFilters(item, filters)

  t.true(ret)
})

test('should return false when one filter return false', (t) => {
  const item = {}
  const filters = [
    (item) => true,
    (item) => false
  ]

  const ret = filterWithFilters(item, filters)

  t.false(ret)
})

test('should return true when all filters return true', (t) => {
  const item = {}
  const filters = [
    (item) => true,
    (item) => true
  ]

  const ret = filterWithFilters(item, filters)

  t.true(ret)
})

test('should pass item to filters', (t) => {
  const item = { attr: true }
  const filters = [
    (item) => item.attr
  ]

  const ret = filterWithFilters(item, filters)

  t.true(ret)
})

test('should skip non-filters', (t) => {
  const item = {}
  const filters = [
    (item) => true,
    null,
    'not a filter'
  ]

  const ret = filterWithFilters(item, filters)

  t.true(ret)
})

test('should accept only a filter function - returning true', (t) => {
  const item = {}
  const filter = (item) => true

  const ret = filterWithFilters(item, filter)

  t.true(ret)
})

test('should accept only a filter function - returning false', (t) => {
  const item = {}
  const filter = (item) => false

  const ret = filterWithFilters(item, filter)

  t.false(ret)
})

test('should accept only a filter function - and pass it the item', (t) => {
  const item = { arg: true }
  const filter = (item) => item.arg

  const ret = filterWithFilters(item, filter)

  t.true(ret)
})

test('should skip filters throwing errors', (t) => {
  const item = {}
  const filters = [
    (item) => true,
    (item) => { throw new Error() }
  ]

  let ret
  t.notThrows(() => {
    ret = filterWithFilters(item, filters)
  })

  t.true(ret)
})

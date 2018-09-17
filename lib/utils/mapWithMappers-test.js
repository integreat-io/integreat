import test from 'ava'

import mapWithMappers from './mapWithMappers'

test('should exist', (t) => {
  t.is(typeof mapWithMappers, 'function')
})

test('should map with array of mapper objects', (t) => {
  const mappers = [
    { from: (value) => value.length },
    { from: (value) => value + 1 },
    { from: (value) => 'Result: ' + value }
  ]

  const ret = mapWithMappers('value', mappers)

  t.is(ret, 'Result: 6')
})

test('should map with array of mapper objects in reverse', (t) => {
  const mappers = [
    { to: (value) => 'Result: ' + value },
    { to: (value) => value + 1 },
    { to: (value) => value.length }
  ]

  const ret = mapWithMappers('value', mappers, true)

  t.is(ret, 'Result: 6')
})

test('should map with array of mapper objects and mapper functions', (t) => {
  const mappers = [
    { from: (value) => value.length },
    (value) => value + 1,
    { from: (value) => 'Result: ' + value, to: (value) => 'Not this' }
  ]

  const ret = mapWithMappers('value', mappers)

  t.is(ret, 'Result: 6')
})

test('should not map with array of mapper functions in reverse', (t) => {
  const mappers = [
    (value) => 'Result: ' + value,
    (value) => value + 1,
    (value) => value.length
  ]

  const ret = mapWithMappers('value', mappers, true)

  t.is(ret, 'value')
})

test('should skip mapping with no mappers', (t) => {
  const ret = mapWithMappers('value')

  t.is(ret, 'value')
})

test('should only map with array', (t) => {
  const ret = mapWithMappers('value', 'no mapper')

  t.is(ret, 'value')
})

test('should skip non-mappers in array', (t) => {
  const mappers = [
    null,
    { from: (value) => value.length },
    'no mapper'
  ]

  const ret = mapWithMappers('value', mappers)

  t.is(ret, 5)
})

test('should skip mapping with empty array', (t) => {
  const ret = mapWithMappers('value', [])

  t.is(ret, 'value')
})

test('should map service array', (t) => {
  const mapper = [(value) => value.length]
  const service = ['value', 'one', 'last']
  const expected = [5, 3, 4]

  const ret = mapWithMappers(service, mapper)

  t.deepEqual(ret, expected)
})

test('should skip map throwing an error', (t) => {
  const mappers = [
    (value) => value.length,
    () => { throw new Error() }
  ]

  let ret
  t.notThrows(() => {
    ret = mapWithMappers('value', mappers)
  })

  t.is(ret, 5)
})

test('should provide mapper function with original data', (t) => {
  const data = { value: 'old' }
  const mapper = [(value, data) => data.value]

  const ret = mapWithMappers('value', mapper, false, data)

  t.is(ret, 'old')
})

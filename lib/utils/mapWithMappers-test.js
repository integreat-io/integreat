import test from 'ava'

import mapWithMappers from './mapWithMappers'

test('should exist', (t) => {
  t.is(typeof mapWithMappers, 'function')
})

test('should map value with one mapper function', (t) => {
  const mapper = (value) => value.length

  const ret = mapWithMappers('value', mapper)

  t.is(ret, 5)
})

test('should not map value with one mapper function in reverse', (t) => {
  const mapper = (value) => value.length

  const ret = mapWithMappers('value', mapper, true)

  t.is(ret, 'value')
})

test('should map value with one mapper object', (t) => {
  const mapper = {from: (value) => value.length}

  const ret = mapWithMappers('value', mapper)

  t.is(ret, 5)
})

test('should map value with one mapper object in reverse', (t) => {
  const mapper = {to: (value) => value.length}

  const ret = mapWithMappers('value', mapper, true)

  t.is(ret, 5)
})

test('should map with array of mapper functions', (t) => {
  const mappers = [
    (value) => value.length,
    (value) => value + 1,
    (value) => 'Result: ' + value
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

test('should map with array of mapper objects', (t) => {
  const mappers = [
    {from: (value) => value.length},
    {from: (value) => value + 1},
    {from: (value) => 'Result: ' + value}
  ]

  const ret = mapWithMappers('value', mappers)

  t.is(ret, 'Result: 6')
})

test('should map with array of mapper objects in reverse', (t) => {
  const mappers = [
    {to: (value) => 'Result: ' + value},
    {to: (value) => value + 1},
    {to: (value) => value.length}
  ]

  const ret = mapWithMappers('value', mappers, true)

  t.is(ret, 'Result: 6')
})

test('should map with array of mapper objects and mapper functions', (t) => {
  const mappers = [
    {from: (value) => value.length},
    (value) => value + 1,
    {from: (value) => 'Result: ' + value, to: (value) => 'Not this'}
  ]

  const ret = mapWithMappers('value', mappers)

  t.is(ret, 'Result: 6')
})

test('should skip mapping with no mappers', (t) => {
  const ret = mapWithMappers('value')

  t.is(ret, 'value')
})

test('should skip mapping if mappers is not an array, a function or a map object', (t) => {
  const ret = mapWithMappers('value', 'no mapper')

  t.is(ret, 'value')
})

test('should skip non-mappers in array', (t) => {
  const mappers = [
    null,
    {from: (value) => value.length},
    'no mapper'
  ]

  const ret = mapWithMappers('value', mappers)

  t.is(ret, 5)
})

test('should skip mapping with empty array', (t) => {
  const ret = mapWithMappers('value', [])

  t.is(ret, 'value')
})

test('should map source array', (t) => {
  const mapper = (value) => value.length
  const source = ['value', 'one', 'last']
  const expected = [5, 3, 4]

  const ret = mapWithMappers(source, mapper)

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

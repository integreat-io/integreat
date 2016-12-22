import test from 'ava'

import processAttribute from './processAttribute'

test('should exist', (t) => {
  t.is(typeof processAttribute, 'function')
})

test('should return value if nothing else is given', (t) => {
  const ret = processAttribute('value')

  t.is(ret, 'value')
})

test('should parse value', (t) => {
  const parse = (value) => value.length

  const ret = processAttribute('value', null, parse)

  t.is(ret, 5)
})

test('should skip parse if not a function', (t) => {
  const ret = processAttribute('value', null, 'noFunction')

  t.is(ret, 'value')
})

test('should transform value', (t) => {
  const transform = (value) => value + 's'

  const ret = processAttribute('value', null, null, transform)

  t.is(ret, 'values')
})

test('should skip transform if not a function', (t) => {
  const ret = processAttribute('value', null, null, 'noFunction')

  t.is(ret, 'value')
})

test('should format value', (t) => {
  const format = (value) => value.toUpperCase()

  const ret = processAttribute('value', null, null, null, format)

  t.is(ret, 'VALUE')
})

test('should skip format if not a function', (t) => {
  const ret = processAttribute('value', null, null, null, 'noFunction')

  t.is(ret, 'value')
})

test('should parse, transform, and parse in that order', (t) => {
  const parse = (value) => value.length
  const transform = (value) => value + 1
  const format = (value) => 'Result: ' + value

  const ret = processAttribute('value', null, parse, transform, format)

  t.is(ret, 'Result: 6')
})

test('should return default value if no value is given', (t) => {
  const ret = processAttribute(null, 'default')

  t.is(ret, 'default')
})

test('should not return default value when value is given', (t) => {
  const ret = processAttribute('value', 'default')

  t.is(ret, 'value')
})

test('should not treat empty string as no value', (t) => {
  const ret = processAttribute('', 'default')

  t.is(ret, '')
})

test('should not parse, transform, or format default value', (t) => {
  const fn = (value) => value + '.'

  const ret = processAttribute(null, 'default', fn, fn, fn)

  t.is(ret, 'default')
})

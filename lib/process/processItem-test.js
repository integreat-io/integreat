import test from 'ava'

import processItem from './processItem'

test('should exist', (t) => {
  t.is(typeof processItem, 'function')
})

test('should return object with no attributes', (t) => {
  const item = {}
  const expected = {attributes: {}}

  const ret = processItem(item)

  t.deepEqual(ret, expected)
})

test('should return defined attributes', (t) => {
  const item = {values: {first: 1, second: {value: 2}}}
  const attrDefs = {
    one: {path: 'values.first'},
    two: {path: 'values.second.value'}
  }
  const expected = {attributes: {one: 1, two: 2}}

  const ret = processItem(item, attrDefs)

  t.deepEqual(ret, expected)
})

test('should parse, transform, and format attributes', (t) => {
  const item = {value: 'value'}
  const attrDefs = {
    length: {
      path: 'value',
      parse: (value) => value.length,
      transform: (value) => value + 1,
      format: (value) => 'Less than ' + value
    }
  }
  const expected = {length: 'Less than 6'}

  const ret = processItem(item, attrDefs)

  t.deepEqual(ret.attributes, expected)
})

test('should use default value for attributes', (t) => {
  const item = {}
  const attrDefs = {some: {path: 'unknown', defaultValue: 'thing'}}
  const expected = {some: 'thing'}

  const ret = processItem(item, attrDefs)

  t.deepEqual(ret.attributes, expected)
})

test('should use null when no default value is set', (t) => {
  const item = {}
  const attrDefs = {some: {path: 'unknown'}}
  const expected = {some: null}

  const ret = processItem(item, attrDefs)

  t.deepEqual(ret.attributes, expected)
})

test('should not treat empty string as not set', (t) => {
  const item = {thing: ''}
  const attrDefs = {some: {path: 'thing'}}
  const expected = {some: ''}

  const ret = processItem(item, attrDefs)

  t.deepEqual(ret.attributes, expected)
})

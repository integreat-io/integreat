import test from 'ava'

import fieldMapper from './fieldMapper'

// Tests

test('should exist', (t) => {
  t.is(typeof fieldMapper, 'function')
})

test('should set key and type', (t) => {
  const attr = fieldMapper({key: 'id', type: 'integer'})

  t.is(attr.key, 'id')
  t.is(attr.type, 'integer')
})

test('should set default attributes', (t) => {
  const attr = fieldMapper()

  t.is(attr.key, null)
  t.is(attr.type, 'string')
})

test('should use `date` as default type for createdAt and updatedAt', (t) => {
  const createdAt = fieldMapper({key: 'createdAt'})
  const updatedAt = fieldMapper({key: 'updatedAt'})

  t.is(createdAt.type, 'date')
  t.is(updatedAt.type, 'date')
})

test('should use type as default type for relationship', (t) => {
  const relationship = fieldMapper({key: 'user'}, {isRelationship: true})

  t.is(relationship.type, 'user')
})

// Tests -- fromSource

test('fromSource should exist', (t) => {
  const attr = fieldMapper()

  t.truthy(attr)
  t.is(typeof attr.fromSource, 'function')
})

test('fromSource should set attribute value from path', (t) => {
  const attr = fieldMapper({key: 'headline', path: 'title'})
  const data = {title: 'The title'}
  const target = {}
  const expected = {attributes: {headline: 'The title'}}

  const ret = attr.fromSource(data, target)

  t.deepEqual(ret, expected)
})

test('fromSource should set id value on root', (t) => {
  const attr = fieldMapper({key: 'id', path: 'key'})
  const data = {key: 'ent1'}
  const target = {}
  const expected = {id: 'ent1'}

  const ret = attr.fromSource(data, target)

  t.deepEqual(ret, expected)
})

test('fromSource should set attribute value from path and keep existing', (t) => {
  const attr = fieldMapper({key: 'headline', path: 'title'})
  const data = {title: 'The title'}
  const target = {attributes: {author: 'John F.'}}
  const expected = {attributes: {headline: 'The title', author: 'John F.'}}

  const ret = attr.fromSource(data, target)

  t.deepEqual(ret, expected)
})

test('fromSource should set relationship value from path', (t) => {
  const attr = fieldMapper({key: 'author', path: 'meta.writer'}, {isRelationship: true})
  const data = {meta: {writer: 'johnf'}}
  const target = {}
  const expected = {relationships: {author: 'johnf'}}

  const ret = attr.fromSource(data, target)

  t.deepEqual(ret, expected)
})

test('fromSource should set relationship value from path and keep existing', (t) => {
  const attr = fieldMapper({key: 'author', path: 'meta.writer'}, {isRelationship: true})
  const data = {meta: {writer: 'johnf'}}
  const target = {relationships: {section: 'fiction'}}
  const expected = {relationships: {author: 'johnf', section: 'fiction'}}

  const ret = attr.fromSource(data, target)

  t.deepEqual(ret, expected)
})

test('fromSource should use key when no path', (t) => {
  const attr = fieldMapper({key: 'title'})
  const data = {title: 'The title'}
  const target = {}
  const expected = {attributes: {title: 'The title'}}

  const ret = attr.fromSource(data, target)

  t.deepEqual(ret, expected)
})

test('fromSource should return target when no value found', (t) => {
  const format = [() => 'Formatted']
  const attr = fieldMapper({key: 'headline', path: 'title', format})
  const target = {id: 'ent1'}
  const expected = {id: 'ent1'}

  const ret = attr.fromSource({}, target)

  t.deepEqual(ret, expected)
})

test('fromSource should not set type attribute', (t) => {
  const attr = fieldMapper({key: 'type'})
  const data = {type: 'entry'}
  const target = {id: 'ent1'}
  const expected = {id: 'ent1'}

  const ret = attr.fromSource(data, target)

  t.deepEqual(ret, expected)
})

test('fromSource should return value from param', (t) => {
  const attr = fieldMapper({key: 'active', param: 'isActive'})
  const params = {isActive: true}
  const target = {}
  const expected = {attributes: {active: true}}

  const ret = attr.fromSource({}, target, params)

  t.deepEqual(ret, expected)
})

test('fromSource should map with format pipeline', (t) => {
  const formatters = {
    length: (value) => value.length,
    plusOne: {from: (value) => value + 1}
  }
  const format = [
    'length',
    'plusOne',
    (value) => 'Result: ' + value,
    'unknown',
    null
  ]
  const attr = fieldMapper({key: 'title', format}, {formatters})
  const data = {title: 'value'}
  const target = {}
  const expected = {attributes: {title: 'Result: 6'}}

  const ret = attr.fromSource(data, target)

  t.deepEqual(ret, expected)
})

test('fromSource should provide format function with original value', (t) => {
  const format = [
    (value) => 'Result: ' + value.length,
    (value, data) => `${value} (${data})`
  ]
  const attr = fieldMapper({key: 'title', format})
  const data = {title: 'value'}
  const target = {}
  const expected = {attributes: {title: 'Result: 5 (value)'}}

  const ret = attr.fromSource(data, target)

  t.deepEqual(ret, expected)
})

// Tests -- toSource

test('toSource should exist', (t) => {
  const attr = fieldMapper()

  t.is(typeof attr.toSource, 'function')
})

test('toSource should set value on target according to path', (t) => {
  const attr = fieldMapper({key: 'headline', path: 'title'})
  const data = {attributes: {headline: 'The title'}}
  const expected = {title: 'The title'}

  const ret = attr.toSource(data, {})

  t.deepEqual(ret, expected)
})

test('toSource should return untouched target when no attributes', (t) => {
  const attr = fieldMapper({key: 'headline', path: 'title'})
  const data = {attributes: {}, relationships: {}}
  const target = {id: 'ent1'}
  const expected = {id: 'ent1'}

  const ret = attr.toSource(data, target)

  t.deepEqual(ret, expected)
})

test('toSource should set id on target according to path', (t) => {
  const attr = fieldMapper({key: 'id', path: 'unique'})
  const data = {id: 'ent1'}
  const expected = {unique: 'ent1'}

  const ret = attr.toSource(data, {})

  t.deepEqual(ret, expected)
})

test('toSource should set rel on target according to path', (t) => {
  const attr = fieldMapper({key: 'author', path: 'meta.writer'}, {isRelationship: true})
  const data = {attributes: {}, relationships: {author: {id: 'johnf', type: 'user'}}}
  const expected = {meta: {writer: 'johnf'}}

  const ret = attr.toSource(data, {})

  t.deepEqual(ret, expected)
})

test('toSource should return untouched target when no relationships', (t) => {
  const attr = fieldMapper({key: 'author', path: 'meta.writer'}, {isRelationship: true})
  const data = {attributes: {}, relationships: {}}
  const target = {id: 'ent1'}
  const expected = {id: 'ent1'}

  const ret = attr.toSource(data, target)

  t.deepEqual(ret, expected)
})

test('toSource should use key as path when no path', (t) => {
  const attr = fieldMapper({key: 'headline'})
  const data = {attributes: {headline: 'The title'}}
  const target = {}
  const expected = {headline: 'The title'}

  const ret = attr.toSource(data, target)

  t.deepEqual(ret, expected)
})

test('toSource should return untouched target when no value', (t) => {
  const attr = fieldMapper({key: 'headline', path: 'title'})
  const target = {}
  const expected = {}

  const ret = attr.toSource(undefined, target)

  t.deepEqual(ret, expected)
})

test('toSource should format', (t) => {
  const format = [
    {to: (value) => 'Length: ' + value},
    {to: (value) => value.length}
  ]
  const attr = fieldMapper({key: 'headline', path: 'title', format})
  const data = {attributes: {headline: 'Value'}}
  const expected = {title: 'Length: 5'}

  const ret = attr.toSource(data)

  t.deepEqual(ret, expected)
})

test('toSource should provide format function with original value', (t) => {
  const format = [
    {to: (value, data) => `${value} (${data})`},
    {to: (value) => 'Result: ' + value.length}
  ]
  const attr = fieldMapper({key: 'headline', path: 'title', format})
  const data = {attributes: {headline: 'Value'}}
  const expected = {title: 'Result: 5 (Value)'}

  const ret = attr.toSource(data)

  t.deepEqual(ret, expected)
})

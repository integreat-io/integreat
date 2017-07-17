import test from 'ava'

import prepare from './prepareValue'

test('should exist', (t) => {
  t.is(typeof prepare, 'function')
})

test('should return object', (t) => {
  const ret = prepare()

  t.is(typeof ret, 'object')
})

test('should set key, type, path, and default', (t) => {
  const attrDef = {
    key: 'age',
    type: 'integer',
    path: 'other.path',
    default: 36
  }

  const ret = prepare(attrDef)

  t.is(ret.key, 'age')
  t.is(ret.type, 'integer')
  t.is(ret.path, 'other.path')
  t.is(ret.default, 36)
})

test('should set default params', (t) => {
  const attrDef = {key: 'none'}

  const ret = prepare(attrDef)

  t.is(ret.type, 'string')
  t.is(ret.path, null)
})

test('should use key as default type for relationship', (t) => {
  const attrDef = {key: 'users'}

  const ret = prepare(attrDef, {isRel: true})

  t.is(ret.type, 'users')
})

test('should set format pipeline', (t) => {
  const format = [() => '1', 'two', null, 'unknown']
  const attrDef = {key: 'name', path: 'some.path', format}
  const formatters = {two: {from: () => '2'}}

  const ret = prepare(attrDef, {formatters})

  t.true(Array.isArray(ret.format))
  t.is(ret.format.length, 2)
  t.is(typeof ret.format[0], 'function')
  t.is(ret.format[0](), '1')
  t.is(typeof ret.format[1], 'object')
  t.is(typeof ret.format[1].from, 'function')
  t.is(ret.format[1].from(), '2')
})

test('should not include unmapped formatter ids', (t) => {
  const format = ['unknown']
  const attrDef = {key: 'name', path: 'some.path', format}

  const ret = prepare(attrDef)

  t.is(ret.format.length, 0)
})

test('should add attribute type as format', (t) => {
  const format = [() => '1']
  const attrDef = {key: 'name', path: 'some.path', type: 'string', format}
  const formatters = {string: () => 'A string'}

  const ret = prepare(attrDef, {formatters})

  t.is(ret.format.length, 2)
  t.is(typeof ret.format[1], 'function')
  t.is(ret.format[1](), 'A string')
})

test('should not add relationship type as formatter', (t) => {
  const format = [() => '1']
  const attrDef = {key: 'editors', path: 'some.path', type: 'users', format}
  const formatters = {users: () => 'User format'}

  const ret = prepare(attrDef, {formatters, isRel: true})

  t.is(ret.format.length, 1)
})

test('should set default type date for createdAt and updateAt', (t) => {
  const attrDef1 = {key: 'createdAt', path: 'createdAt'}
  const attrDef2 = {key: 'updatedAt', path: 'updatedAt'}

  const ret1 = prepare(attrDef1)
  const ret2 = prepare(attrDef2)

  t.is(ret1.type, 'date')
  t.is(ret2.type, 'date')
})

test('should add date mapper when defaulting to date type', (t) => {
  const attrDef = {key: 'createdAt', path: 'createdAt'}
  const formatters = {date: () => 'A date'}

  const ret = prepare(attrDef, {formatters})

  t.is(ret.format.length, 1)
  t.is(typeof ret.format[0], 'function')
  t.is(ret.format[0](), 'A date')
})

test('should map array type', (t) => {
  const attrDef = {key: 'allIds', path: 'some.path', type: 'integer[]'}
  const formatters = {integer: (value) => Number.parseInt(value, 10)}

  const ret = prepare(attrDef, {formatters})

  t.is(ret.type, 'integer[]')
  t.is(ret.format.length, 1)
  t.is(ret.format[0], formatters.integer)
})

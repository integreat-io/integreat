import test from 'ava'

import prepare from './prepareItem'

test('should exist', (t) => {
  t.is(typeof prepare, 'function')
})

test('should return object', (t) => {
  const ret = prepare()

  t.is(typeof ret, 'object')
})

test('should set type and path', (t) => {
  const itemDef = {type: 'entry', path: 'the.path'}

  const ret = prepare(itemDef)

  t.is(ret.type, 'entry')
  t.is(ret.path, 'the.path')
})

test('should set map', (t) => {
  const map = [() => '1', 'two', null, 'unknown']
  const itemDef = {type: 'entry', map}
  const mappers = {two: {from: () => '2'}}

  const ret = prepare(itemDef, {mappers})

  t.true(Array.isArray(ret.map))
  t.is(ret.map.length, 2)
  t.is(typeof ret.map[0], 'function')
  t.is(ret.map[0](), '1')
  t.is(typeof ret.map[1], 'object')
  t.is(typeof ret.map[1].from, 'function')
  t.is(ret.map[1].from(), '2')
})

test('should set filterFrom', (t) => {
  const filter = [() => true, 'two', null, 'unknown']
  const itemDef = {type: 'entry', filter}
  const filters = {two: () => false}

  const ret = prepare(itemDef, {filters})

  t.true(Array.isArray(ret.filterFrom))
  t.is(ret.filterFrom.length, 2)
  t.true(ret.filterFrom[0]())
  t.false(ret.filterFrom[1]())
})

test('should set filterFrom from from-param', (t) => {
  const filter = {from: [() => true, 'two', null, 'unknown']}
  const itemDef = {type: 'entry', filter}
  const filters = {two: () => false}

  const ret = prepare(itemDef, {filters})

  t.true(Array.isArray(ret.filterFrom))
  t.is(ret.filterFrom.length, 2)
  t.true(ret.filterFrom[0]())
  t.false(ret.filterFrom[1]())
})

test('should set filterTo from to-param', (t) => {
  const filter = {to: [() => true, 'two', null, 'unknown']}
  const itemDef = {type: 'entry', filter}
  const filters = {two: () => false}

  const ret = prepare(itemDef, {filters})

  t.true(Array.isArray(ret.filterTo))
  t.is(ret.filterTo.length, 2)
  t.true(ret.filterTo[0]())
  t.false(ret.filterTo[1]())
})

test('should set attributes', (t) => {
  const attributes = [
    {key: 'id', path: 'key'},
    {key: 'age', type: 'integer'}
  ]
  const itemDef = {type: 'entry', attributes}

  const ret = prepare(itemDef)

  t.true(Array.isArray(ret.attrs))
  t.is(ret.attrs.length, 2)
  t.is(ret.attrs[0].key, 'id')
  t.is(ret.attrs[0].type, 'string')
  t.is(ret.attrs[0].path, 'key')
  t.is(ret.attrs[1].key, 'age')
  t.is(ret.attrs[1].type, 'integer')
})

test('should set relationships', (t) => {
  const relationships = [
    {key: 'users', path: 'folks'}
  ]
  const itemDef = {type: 'entry', relationships}

  const ret = prepare(itemDef)

  t.true(Array.isArray(ret.rels))
  t.is(ret.rels.length, 1)
  t.is(ret.rels[0].key, 'users')
  t.is(ret.rels[0].type, 'users')
  t.is(ret.rels[0].path, 'folks')
})

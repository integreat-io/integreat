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

  t.true(Array.isArray(ret.attributes))
  t.is(ret.attributes.length, 2)
  t.is(ret.attributes[0].key, 'id')
  t.is(ret.attributes[0].type, 'string')
  t.is(ret.attributes[0].path, 'key')
  t.is(ret.attributes[1].key, 'age')
  t.is(ret.attributes[1].type, 'integer')
})

test('should set attribute types from type def', (t) => {
  const attributes = [{key: 'id'}, {key: 'age'}]
  const itemDef = {type: 'entry', attributes}
  const typeDef = {
    id: 'entry',
    attributes: {
      id: {type: 'string'},
      age: {type: 'integer'}
    }
  }

  const ret = prepare(itemDef, {typeDef})

  t.true(Array.isArray(ret.attributes))
  t.is(ret.attributes.length, 2)
  t.is(ret.attributes[0].key, 'id')
  t.is(ret.attributes[0].type, 'string')
  t.is(ret.attributes[1].key, 'age')
  t.is(ret.attributes[1].type, 'integer')
})

test('should set defaultFrom from type def', (t) => {
  const attributes = [{key: 'id'}, {key: 'age'}]
  const itemDef = {type: 'entry', attributes}
  const typeDef = {
    id: 'entry',
    attributes: {
      id: {type: 'string'},
      age: {type: 'integer', default: 23}
    }
  }

  const ret = prepare(itemDef, {typeDef})

  t.true(Array.isArray(ret.attributes))
  t.is(ret.attributes.length, 2)
  t.is(ret.attributes[0].defaultFrom, undefined)
  t.is(ret.attributes[1].defaultFrom, 23)
})

test('should only set defined attributes', (t) => {
  const attributes = [{key: 'title'}, {key: 'unknown'}]
  const itemDef = {type: 'entry', attributes}
  const typeDef = {
    id: 'entry',
    attributes: {
      title: {type: 'string'}
    }
  }

  const ret = prepare(itemDef, {typeDef})

  t.true(Array.isArray(ret.attributes))
  t.is(ret.attributes.length, 1)
  t.is(ret.attributes[0].key, 'title')
})

test('should always set id, createdAt, and updatedAt', (t) => {
  const attributes = [{key: 'id'}, {key: 'createdAt'}, {key: 'updatedAt'}]
  const itemDef = {type: 'entry', attributes}
  const typeDef = {
    id: 'entry',
    attributes: {
      title: {type: 'string'}
    }
  }

  const ret = prepare(itemDef, {typeDef})

  t.true(Array.isArray(ret.attributes))
  t.is(ret.attributes.length, 3)
  t.is(ret.attributes[0].key, 'id')
  t.is(ret.attributes[1].key, 'createdAt')
  t.is(ret.attributes[2].key, 'updatedAt')
})

test('should set relationships', (t) => {
  const relationships = [
    {key: 'users', path: 'folks'}
  ]
  const itemDef = {type: 'entry', relationships}

  const ret = prepare(itemDef)

  t.true(Array.isArray(ret.relationships))
  t.is(ret.relationships.length, 1)
  t.is(ret.relationships[0].key, 'users')
  t.is(ret.relationships[0].type, 'users')
  t.is(ret.relationships[0].path, 'folks')
})

test('should set relationship type and defaultFrom from type def', (t) => {
  const relationships = [{key: 'users'}]
  const itemDef = {type: 'entry', relationships}
  const typeDef = {
    id: 'entry',
    relationships: {
      users: {type: 'user', default: 'admin'}
    }
  }

  const ret = prepare(itemDef, {typeDef})

  t.true(Array.isArray(ret.relationships))
  t.is(ret.relationships.length, 1)
  t.is(ret.relationships[0].key, 'users')
  t.is(ret.relationships[0].type, 'user')
  t.is(ret.relationships[0].defaultFrom, 'admin')
})

test('should only set defined relationships', (t) => {
  const relationships = [{key: 'unknown'}]
  const itemDef = {type: 'entry', relationships}
  const typeDef = {
    id: 'entry',
    relationships: {users: {type: 'user'}}
  }

  const ret = prepare(itemDef, {typeDef})

  t.true(Array.isArray(ret.relationships))
  t.is(ret.relationships.length, 0)
})

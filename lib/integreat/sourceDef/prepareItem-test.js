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

test('should set transform', (t) => {
  const transform = [() => '1', 'two', null, 'unknown']
  const itemDef = {type: 'entry', transform}
  const transformers = {two: {from: () => '2'}}

  const ret = prepare(itemDef, {transformers})

  t.true(Array.isArray(ret.transform))
  t.is(ret.transform.length, 2)
  t.is(typeof ret.transform[0], 'function')
  t.is(ret.transform[0](), '1')
  t.is(typeof ret.transform[1], 'object')
  t.is(typeof ret.transform[1].from, 'function')
  t.is(ret.transform[1].from(), '2')
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
  const attributes = {
    age: {type: 'integer', path: 'yearsOld'}
  }
  const itemDef = {type: 'entry', attributes}
  const typeDef = {
    id: 'entry',
    attributes: {
      age: {type: 'integer'}
    }
  }

  const ret = prepare(itemDef, {typeDef})

  t.true(Array.isArray(ret.attributes))
  t.is(ret.attributes.length, 1)
  t.is(ret.attributes[0].key, 'age')
  t.is(ret.attributes[0].type, 'integer')
  t.is(ret.attributes[0].path, 'yearsOld')
})

test('should set type and default from type def', (t) => {
  const attributes = {age: {}, name: {}}
  const itemDef = {type: 'entry', attributes}
  const typeDef = {
    id: 'entry',
    attributes: {
      age: {type: 'integer', default: 23},
      name: {type: 'string'}
    }
  }

  const ret = prepare(itemDef, {typeDef})

  t.true(Array.isArray(ret.attributes))
  t.is(ret.attributes.length, 2)
  t.is(ret.attributes[0].key, 'age')
  t.is(ret.attributes[0].type, 'integer')
  t.is(ret.attributes[0].default, 23)
  t.is(ret.attributes[1].key, 'name')
  t.is(ret.attributes[1].type, 'string')
  t.is(ret.attributes[1].default, undefined)
})

test('should only set attribute mappings defined in type def', (t) => {
  const attributes = {title: {}, unknown: {}}
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
  const attributes = {id: {}, createdAt: {}, updatedAt: {}}
  const itemDef = {type: 'entry', attributes}
  const typeDef = {
    id: 'entry',
    attributes: {}
  }

  const ret = prepare(itemDef, {typeDef})

  t.true(Array.isArray(ret.attributes))
  t.is(ret.attributes.length, 3)
  t.is(ret.attributes[0].key, 'id')
  t.is(ret.attributes[1].key, 'createdAt')
  t.is(ret.attributes[2].key, 'updatedAt')
})

test('should treat missing type def attributes property as no attributes', (t) => {
  const attributes = {id: {}, createdAt: {}, updatedAt: {}, title: {}}
  const itemDef = {type: 'entry', attributes}
  const typeDef = {
    id: 'entry'
  }

  const ret = prepare(itemDef, {typeDef})

  t.true(Array.isArray(ret.attributes))
  t.is(ret.attributes.length, 3)
  t.is(ret.attributes[0].key, 'id')
  t.is(ret.attributes[1].key, 'createdAt')
  t.is(ret.attributes[2].key, 'updatedAt')
})

test('should set relationships', (t) => {
  const relationships = {users: {path: 'folks'}}
  const itemDef = {type: 'entry', relationships}

  const ret = prepare(itemDef)

  t.true(Array.isArray(ret.relationships))
  t.is(ret.relationships.length, 1)
  t.is(ret.relationships[0].key, 'users')
  t.is(ret.relationships[0].type, 'users')
  t.is(ret.relationships[0].path, 'folks')
})

test('should set relationship type and default from type def', (t) => {
  const relationships = {users: {}}
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
  t.is(ret.relationships[0].default, 'admin')
})

test('should only set defined relationships', (t) => {
  const relationships = {unknown: {}}
  const itemDef = {type: 'entry', relationships}
  const typeDef = {
    id: 'entry',
    relationships: {users: {type: 'user'}}
  }

  const ret = prepare(itemDef, {typeDef})

  t.true(Array.isArray(ret.relationships))
  t.is(ret.relationships.length, 0)
})

test('should set restValues', (t) => {
  const attributes = {
    name: {},
    age: {}
  }
  const itemDef = {type: 'entry', attributes}
  const typeDef = {
    id: 'entry',
    attributes: {
      name: {type: 'string', default: 'John'},
      age: {type: 'integer', default: 18},
      email: {type: 'string'},
      level: {type: 'string', default: 'Beginner'}
    },
    relationships: {
      image: {type: 'multimedia', default: 'nn'},
      children: {type: 'user'}
    }
  }

  const ret = prepare(itemDef, {typeDef})

  t.deepEqual(ret.restValues, {
    attributes: {email: null, level: 'Beginner'},
    relationships: {image: {id: 'nn', type: 'multimedia'}, children: null}
  })
})

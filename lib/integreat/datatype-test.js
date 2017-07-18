import test from 'ava'

import datatype from './datatype'

// Tests

test('should exist', (t) => {
  t.is(typeof datatype, 'function')
})

test('should return correctly formatted type', (t) => {
  const attributes = {
    title: {type: 'string'},
    text: {type: 'string'},
    age: {type: 'integer'}
  }
  const relationships = {
    author: {type: 'user'}
  }
  const type = {
    id: 'entry',
    source: 'entries',
    attributes,
    relationships
  }

  const ret = datatype(type)

  t.truthy(ret)
  t.is(ret.id, 'entry')
  t.is(ret.source, 'entries')
  t.deepEqual(ret.attributes, attributes)
  t.deepEqual(ret.relationships, relationships)
})

test('should expand short value form', (t) => {
  const type = {
    id: 'entry',
    source: 'entries',
    attributes: {
      title: 'string',
      age: 'integer'
    },
    relationships: {
      author: 'user'
    }
  }
  const expectedAttrs = {
    title: {type: 'string'},
    age: {type: 'integer'}
  }
  const expectedRels = {
    author: {type: 'user'}
  }

  const ret = datatype(type)

  t.deepEqual(ret.attributes, expectedAttrs)
  t.deepEqual(ret.relationships, expectedRels)
})

test('should handle missing attributes and relationships', (t) => {
  const type = {
    id: 'entry',
    source: 'entries'
  }

  const ret = datatype(type)

  t.deepEqual(ret.attributes, {})
  t.deepEqual(ret.relationships, {})
})

// Tests -- missingAttributes

test('missingAttributes should exist', (t) => {
  const type = datatype({id: 'entry'})

  t.is(typeof type.missingAttributes, 'function')
})

test('missingAttributes should return default values', (t) => {
  const attributes = {
    name: {default: 'Unknown'},
    age: {default: null},
    email: {default: null},
    image: {}
  }
  const type = datatype({id: 'entry', attributes})
  const mappingAttrs = {email: {}}
  const expectedAttrs = {name: 'Unknown', age: null, image: null}

  const ret = type.missingAttributes(mappingAttrs)

  t.truthy(ret)
  t.deepEqual(ret, expectedAttrs)
})

test('missingAttributes should not include type', (t) => {
  const attributes = {
    type: {default: 'untyped'}
  }
  const type = datatype({id: 'entry', attributes})
  const mappingAttrs = {}
  const expectedAttrs = {}

  const ret = type.missingAttributes(mappingAttrs)

  t.truthy(ret)
  t.deepEqual(ret, expectedAttrs)
})

// Tests -- missingRelationships

test('missingRelationships should exist', (t) => {
  const type = datatype({id: 'entry'})

  t.is(typeof type.missingRelationships, 'function')
})

test('missingRelationships should return default values', (t) => {
  const relationships = {
    author: {type: 'user', default: 'admin'},
    images: {type: 'multimedia'},
    videos: {type: 'multimedia'},
    friends: {type: 'user', default: null}
  }
  const type = datatype({id: 'entry', relationships})
  const mappingRels = {videos: {}}
  const expectedRels = {
    author: {id: 'admin', type: 'user'},
    friends: null
  }

  const ret = type.missingRelationships(mappingRels)

  t.truthy(ret)
  t.deepEqual(ret, expectedRels)
})

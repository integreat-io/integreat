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

test('should exclude reserved attributes', (t) => {
  const attributes = {
    id: {type: 'string'},
    type: {type: 'string'},
    createdAt: {type: 'date'},
    updatedAt: {type: 'date'}
  }
  const type = {
    id: 'entry',
    source: 'entries',
    attributes
  }

  const ret = datatype(type)

  t.deepEqual(ret.attributes, {})
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

// Tests -- cast

test('cast should exist', (t) => {
  const type = datatype({id: 'entry'})

  t.is(typeof type.cast, 'function')
})

test('cast should set type', (t) => {
  const type = datatype({id: 'entry'})

  const ret = type.cast({})

  t.is(ret.type, 'entry')
})

test('cast should generate random id', (t) => {
  const type = datatype({id: 'entry'})

  const ret1 = type.cast({})
  const ret2 = type.cast({})

  t.is(typeof ret1.id, 'string')
  t.is(typeof ret2.id, 'string')
  t.not(ret1.id, ret2.id)
})

test('cast should use id attribute', (t) => {
  const type = datatype({id: 'entry'})
  const data = {attributes: {id: 'ent1'}}

  const ret = type.cast(data)

  t.is(ret.id, 'ent1')
  t.is(ret.attributes.id, undefined)
})

test('cast should use id property', (t) => {
  const type = datatype({id: 'entry'})
  const data = {id: 'ent1', attributes: {id: 'wrong'}}

  const ret = type.cast(data)

  t.is(ret.id, 'ent1')
  t.is(ret.attributes.id, undefined)
})

test('cast should set createdAt and updatedAt to current Date when not specified', (t) => {
  const type = datatype({id: 'entry'})
  const before = Date.now()

  const ret = type.cast({})

  const after = Date.now()
  t.truthy(ret.createdAt)
  t.true(ret.createdAt.getTime() >= before)
  t.true(ret.createdAt.getTime() <= after)
  t.is(ret.createdAt.getTime(), ret.updatedAt.getTime())
})

test('cast should use createdAt and updatedAt attributes', (t) => {
  const createdAt = new Date('2017-05-11')
  const updatedAt = new Date('2017-05-13')
  const type = datatype({id: 'entry'})
  const data = {attributes: {createdAt, updatedAt}}

  const ret = type.cast(data)

  t.is(ret.createdAt.getTime(), createdAt.getTime())
  t.is(ret.updatedAt.getTime(), updatedAt.getTime())
  t.is(ret.attributes.createdAt, undefined)
  t.is(ret.attributes.updatedAt, undefined)
})

test('cast should use createdAt and updatedAt properties', (t) => {
  const createdAt = new Date('2017-05-11')
  const updatedAt = new Date('2017-05-13')
  const type = datatype({id: 'entry'})
  const data = {createdAt, updatedAt}

  const ret = type.cast(data)

  t.is(ret.createdAt.getTime(), createdAt.getTime())
  t.is(ret.updatedAt.getTime(), updatedAt.getTime())
})

test('cast should cast createdAt and updatedAt attributes', (t) => {
  const createdAt = '2017-05-11T18:01:43.000Z'
  const updatedAt = '2017-05-13T11:04:51.000Z'
  const type = datatype({id: 'entry'})
  const data = {attributes: {createdAt, updatedAt}}

  const ret = type.cast(data)

  t.is(ret.createdAt.getTime(), new Date(createdAt).getTime())
  t.is(ret.updatedAt.getTime(), new Date(updatedAt).getTime())
})

test('cast should cast createdAt and updatedAt properties', (t) => {
  const createdAt = '2017-05-11T18:01:43.000Z'
  const updatedAt = '2017-05-13T11:04:51.000Z'
  const type = datatype({id: 'entry'})
  const data = {createdAt, updatedAt}

  const ret = type.cast(data)

  t.is(ret.createdAt.getTime(), new Date(createdAt).getTime())
  t.is(ret.updatedAt.getTime(), new Date(updatedAt).getTime())
})

test('cast should use createdAt when updatedAt is not specified', (t) => {
  const createdAt = new Date('2017-05-11')
  const type = datatype({id: 'entry'})
  const data = {createdAt}

  const ret = type.cast(data)

  t.is(ret.updatedAt.getTime(), createdAt.getTime())
})

test('cast should use updatedAt when createdAt is not specified', (t) => {
  const updatedAt = new Date('2017-05-11')
  const type = datatype({id: 'entry'})
  const data = {updatedAt}

  const ret = type.cast(data)

  t.is(ret.createdAt.getTime(), updatedAt.getTime())
})

test('cast should cast provided attributes', (t) => {
  const attributes = {
    title: 'string',
    views: 'integer',
    rating: 'float',
    reviewedAt: 'date',
    notInData: 'string'
  }
  const type = datatype({id: 'entry', attributes})
  const data = {attributes: {
    title: 3,
    views: '344',
    rating: '5.1',
    reviewedAt: '2017-06-01T11:43:00.000Z',
    unknown: 'Not this'
  }}
  const expected = {
    title: '3',
    views: 344,
    rating: 5.1,
    reviewedAt: new Date('2017-06-01T11:43:00.000Z')
  }

  const ret = type.cast(data)

  t.deepEqual(ret.attributes, expected)
})

test('cast should not return invalid attributes', (t) => {
  const attributes = {
    title: 'string',
    views: 'integer',
    rating: 'float',
    reviewedAt: 'date',
    nextReview: 'date'
  }
  const type = datatype({id: 'entry', attributes})
  const data = {attributes: {
    title: null,
    views: 'notint',
    rating: 'notfloat',
    reviewedAt: 'notdate',
    nextReview: null
  }}
  const expected = {}

  const ret = type.cast(data)

  t.deepEqual(ret.attributes, expected)
})

test('cast should cast provided relationships', (t) => {
  const relationships = {
    user: 'user',
    comments: 'comment',
    author: 'user',
    noteInData: 'nope'
  }
  const type = datatype({id: 'entry', relationships})
  const data = {relationships: {
    user: 'johnf',
    comments: ['no1', 'no2'],
    author: null,
    unknown: 'Nope'
  }}
  const expected = {
    user: {id: 'johnf', type: 'user'},
    comments: [{id: 'no1', type: 'comment'}, {id: 'no2', type: 'comment'}],
    author: null
  }

  const ret = type.cast(data)

  t.deepEqual(ret.relationships, expected)
})

test('cast should cast relationship object', (t) => {
  const relationships = {
    user: 'user'
  }
  const type = datatype({id: 'entry', relationships})
  const data = {relationships: {
    user: {id: 'johnf', type: 'user'}
  }}
  const expected = {
    user: {id: 'johnf', type: 'user'}
  }

  const ret = type.cast(data)

  t.deepEqual(ret.relationships, expected)
})

test('cast should include default attributes', (t) => {
  const attributes = {
    title: {type: 'string', default: 'No title'},
    views: 'integer',
    rating: {type: 'float', default: 3.0}
  }
  const type = datatype({id: 'entry', attributes})
  const data = {}
  const expected = {
    title: 'No title',
    views: null,
    rating: 3.0
  }
  const useDefaults = true

  const ret = type.cast(data, {useDefaults})

  t.deepEqual(ret.attributes, expected)
})

test('cast should include default relationships', (t) => {
  const relationships = {
    user: {type: 'user', default: 'admin'},
    comments: 'comment',
    author: {type: 'user', default: null}
  }
  const type = datatype({id: 'entry', relationships})
  const data = {}
  const expected = {
    user: {id: 'admin', type: 'user'},
    author: null
  }
  const useDefaults = true

  const ret = type.cast(data, {useDefaults})

  t.deepEqual(ret.relationships, expected)
})

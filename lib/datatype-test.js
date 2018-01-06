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
    plural: 'entries',
    source: 'entries',
    attributes,
    relationships
  }

  const ret = datatype(type)

  t.truthy(ret)
  t.is(ret.id, 'entry')
  t.is(ret.plural, 'entries')
  t.is(ret.source, 'entries')
  t.deepEqual(ret.attributes, attributes)
  t.deepEqual(ret.relationships, relationships)
})

test('should exclude reserved attributes', (t) => {
  const type = {
    id: 'entry',
    source: 'entries',
    attributes: {
      id: {type: 'string'},
      type: {type: 'string'},
      createdAt: {type: 'date'},
      updatedAt: {type: 'date'}
    }
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

test('cast should return null when no data', (t) => {
  const type = datatype({id: 'entry'})

  const ret = type.cast(null)

  t.is(ret, null)
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
  const {createdAt, updatedAt} = ret.attributes
  t.truthy(createdAt)
  t.true(createdAt.getTime() >= before)
  t.true(createdAt.getTime() <= after)
  t.is(createdAt.getTime(), updatedAt.getTime())
})

test('cast should use createdAt and updatedAt attributes', (t) => {
  const createdDate = new Date('2017-05-11')
  const updatedDate = new Date('2017-05-13')
  const type = datatype({id: 'entry'})
  const data = {attributes: {createdAt: createdDate, updatedAt: updatedDate}}

  const ret = type.cast(data)

  const {createdAt, updatedAt} = ret.attributes
  t.is(createdAt.getTime(), createdDate.getTime())
  t.is(updatedAt.getTime(), updatedDate.getTime())
})

test('cast should cast createdAt and updatedAt attributes', (t) => {
  const createdDate = '2017-05-11T18:01:43.000Z'
  const updatedDate = '2017-05-13T11:04:51.000Z'
  const type = datatype({id: 'entry'})
  const data = {attributes: {createdAt: createdDate, updatedAt: updatedDate}}

  const ret = type.cast(data)

  const {createdAt, updatedAt} = ret.attributes
  t.is(createdAt.getTime(), new Date(createdDate).getTime())
  t.is(updatedAt.getTime(), new Date(updatedDate).getTime())
})

test('cast should use createdAt when updatedAt is not specified', (t) => {
  const createdDate = new Date('2017-05-11')
  const type = datatype({id: 'entry'})
  const data = {attributes: {createdAt: createdDate}}

  const ret = type.cast(data)

  const {updatedAt} = ret.attributes
  t.is(updatedAt.getTime(), createdDate.getTime())
})

test('cast should use updatedAt when createdAt is not specified', (t) => {
  const updatedDate = new Date('2017-05-11')
  const type = datatype({id: 'entry'})
  const data = {attributes: {updatedAt: updatedDate}}

  const ret = type.cast(data)

  const {createdAt} = ret.attributes
  t.is(createdAt.getTime(), updatedDate.getTime())
})

test('cast should cast provided attributes', (t) => {
  const createdDate = new Date('2017-05-11T18:00:00Z')
  const updatedDate = new Date('2017-05-13T14:00:00Z')
  const def = {
    id: 'entry',
    attributes: {
      title: 'string',
      views: 'integer',
      rating: 'float',
      reviewedAt: 'date',
      isActive: 'boolean',
      notInData: 'string'
    }
  }
  const type = datatype(def)
  const data = {
    attributes: {
      title: 3,
      views: '344',
      rating: '5.1',
      reviewedAt: '2017-06-01T11:43:00.000Z',
      isActive: false,
      unknown: 'Not this',
      createdAt: createdDate,
      updatedAt: updatedDate
    }
  }
  const expected = {
    title: '3',
    views: 344,
    rating: 5.1,
    reviewedAt: new Date('2017-06-01T11:43:00.000Z'),
    isActive: false,
    createdAt: createdDate,
    updatedAt: updatedDate
  }

  const ret = type.cast(data)

  t.deepEqual(ret.attributes, expected)
})

test('cast should cast boolean attributes', (t) => {
  const attributes = {
    isTrue: 'boolean',
    isFalse: 'boolean',
    isFalsy: 'boolean',
    isTruthy: 'boolean',
    isTrueString: 'boolean',
    isFalseString: 'boolean'
  }
  const type = datatype({id: 'entry', attributes})
  const data = {attributes: {
    isTrue: true,
    isFalse: false,
    isFalsy: null,
    isTruthy: 'Something truthy',
    isTrueString: 'true',
    isFalseString: 'false'
  }}

  const ret = type.cast(data)

  t.true(ret.attributes.isTrue)
  t.false(ret.attributes.isFalse)
  t.false(ret.attributes.isFalsy)
  t.true(ret.attributes.isTruthy)
  t.true(ret.attributes.isTrueString)
  t.false(ret.attributes.isFalseString)
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

  const ret = type.cast(data)

  t.deepEqual(Object.keys(ret.attributes), ['createdAt', 'updatedAt'])
})

test('cast should cast provided relationships', (t) => {
  const relationships = {
    user: 'user',
    comments: 'comment',
    author: 'user',
    noteInData: 'nope',
    undefInData: 'undef'
  }
  const type = datatype({id: 'entry', relationships})
  const data = {relationships: {
    user: 'johnf',
    comments: ['no1', 'no2'],
    author: null,
    unknown: 'Nope',
    undefInData: undefined
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
  const useDefaults = true

  const ret = type.cast(data, {useDefaults})

  t.is(ret.attributes.title, 'No title')
  t.is(ret.attributes.views, null)
  t.is(ret.attributes.rating, 3.0)
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

// Tests - relationship query

test('castQueryParams should exist', (t) => {
  const type = datatype({id: 'user'})

  t.is(typeof type.castQueryParams, 'function')
})

test('castQueryParams should return params for rel query', (t) => {
  const data = {
    id: 'johnf',
    type: 'user',
    attributes: {genre: 'fiction'},
    relationships: {country: {id: 'no', type: 'country'}}
  }
  const query = {author: 'id', section: 'genre', market: 'country'}
  const relationships = {books: {type: 'book', query}}
  const type = datatype({id: 'user', relationships})
  const expected = {author: 'johnf', section: 'fiction', market: 'no'}

  const ret = type.castQueryParams('books', data)

  t.deepEqual(ret, expected)
})

test('castQueryParams should return id array from many-relationship', (t) => {
  const data = {
    id: 'johnf',
    type: 'user',
    relationships: {genres: [
      {id: 'fiction', type: 'genre'},
      {id: 'romance', type: 'genre'}
    ]}
  }
  const query = {sections: 'genres'}
  const relationships = {books: {type: 'book', query}}
  const type = datatype({id: 'user', relationships})
  const expected = {sections: ['fiction', 'romance']}

  const ret = type.castQueryParams('books', data)

  t.deepEqual(ret, expected)
})

test('castQueryParams should throw at missing param value', (t) => {
  const data = {id: 'johnf', type: 'user'}
  const query = {section: 'genre'}
  const relationships = {books: {type: 'book', query}}
  const type = datatype({id: 'user', relationships})

  t.throws(() => type.castQueryParams('books', data))
})

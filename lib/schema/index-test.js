import test from 'ava'

import schema from '.'

// Tests

test('should setup schema', (t) => {
  const type = {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    attributes: {
      title: { type: 'string' },
      text: { type: 'string' },
      age: { type: 'integer' }
    },
    relationships: {
      author: { type: 'user' },
      comments: { type: 'comment' }
    },
    access: 'auth'
  }

  const ret = schema(type)

  t.truthy(ret)
  t.is(ret.id, 'entry')
  t.is(ret.plural, 'entries')
  t.is(ret.service, 'entries')
  t.is(ret.access, 'auth')
  t.false(ret.internal)
  t.deepEqual(ret.attributes.title, { type: 'string' })
  t.deepEqual(ret.attributes.text, { type: 'string' })
  t.deepEqual(ret.attributes.age, { type: 'integer' })
  t.deepEqual(ret.relationships.author, { type: 'user' })
})

test('should include base attributes', (t) => {
  const type = {
    id: 'entry',
    service: 'entries',
    attributes: {}
  }
  const expected = {
    id: { type: 'string' },
    type: { type: 'string' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
  }

  const ret = schema(type)

  t.deepEqual(ret.attributes, expected)
})

test('should override base attributes in definition', (t) => {
  const type = {
    id: 'entry',
    service: 'entries',
    attributes: {
      id: { type: 'date' },
      createdAt: { type: 'boolean' },
      updatedAt: { type: 'boolean' }
    }
  }
  const expected = {
    id: { type: 'string' },
    type: { type: 'string' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
  }

  const ret = schema(type)

  t.deepEqual(ret.attributes, expected)
})

test('should alway set relationships object', (t) => {
  const type = {
    id: 'entry',
    service: 'entries',
    attributes: {}
  }

  const ret = schema(type)

  t.deepEqual(ret.relationships, {})
})

test('should expand short value form', (t) => {
  const type = {
    id: 'entry',
    service: 'entries',
    attributes: {
      title: 'string',
      age: 'integer'
    },
    relationships: {
      author: 'user'
    }
  }

  const ret = schema(type)

  t.deepEqual(ret.attributes.title, { type: 'string' })
  t.deepEqual(ret.attributes.age, { type: 'integer' })
  t.deepEqual(ret.relationships.author, { type: 'user' })
})

test('should set internal prop', (t) => {
  const type = {
    id: 'entry',
    service: 'entries',
    internal: true
  }

  const ret = schema(type)

  t.true(ret.internal)
})

// Tests -- cast

test('cast should exist', (t) => {
  const type = schema({ id: 'entry' })

  t.is(typeof type.cast, 'function')
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
      notInData: 'string',
      tokens: 'string[]'
    }
  }
  const type = schema(def)
  const data = {
    attributes: {
      title: 3,
      views: '344',
      rating: '5.1',
      reviewedAt: '2017-06-01T11:43:00.000Z',
      isActive: false,
      unknown: 'Not this',
      createdAt: createdDate,
      updatedAt: updatedDate,
      tokens: ['twitter|23456', 'facebook|12345']
    }
  }
  const expected = {
    title: '3',
    views: 344,
    rating: 5.1,
    reviewedAt: new Date('2017-06-01T11:43:00.000Z'),
    isActive: false,
    createdAt: createdDate,
    updatedAt: updatedDate,
    tokens: ['twitter|23456', 'facebook|12345']
  }

  const ret = type.cast(data, { onlyMappedValues: true })

  t.deepEqual(ret.attributes, expected)
})

test('cast should return null when no data', (t) => {
  const type = schema({ id: 'entry' })

  const ret = type.cast(null)

  t.is(ret, null)
})

test('cast should set type', (t) => {
  const type = schema({ id: 'entry' })

  const ret = type.cast({})

  t.is(ret.type, 'entry')
})

test('cast should generate random id', (t) => {
  const type = schema({ id: 'entry' })

  const ret1 = type.cast({})
  const ret2 = type.cast({})

  t.is(typeof ret1.id, 'string')
  t.is(typeof ret2.id, 'string')
  t.not(ret1.id, ret2.id)
})

test('cast should use id attribute', (t) => {
  const type = schema({ id: 'entry' })
  const data = { attributes: { id: 'ent1' } }

  const ret = type.cast(data)

  t.is(ret.id, 'ent1')
  t.is(ret.attributes.id, undefined)
})

test('cast should use id property', (t) => {
  const type = schema({ id: 'entry' })
  const data = { id: 'ent1', attributes: { id: 'wrong' } }

  const ret = type.cast(data)

  t.is(ret.id, 'ent1')
  t.is(ret.attributes.id, undefined)
})

test('cast should set createdAt and updatedAt to current Date when not specified', (t) => {
  const type = schema({ id: 'entry' })
  const before = Date.now()

  const ret = type.cast({})

  const after = Date.now()
  const { createdAt, updatedAt } = ret.attributes
  t.truthy(createdAt)
  t.true(createdAt.getTime() >= before)
  t.true(createdAt.getTime() <= after)
  t.is(createdAt.getTime(), updatedAt.getTime())
})

test('cast should use createdAt and updatedAt attributes', (t) => {
  const createdDate = new Date('2017-05-11')
  const updatedDate = new Date('2017-05-13')
  const type = schema({ id: 'entry' })
  const data = { attributes: { createdAt: createdDate, updatedAt: updatedDate } }

  const ret = type.cast(data)

  const { createdAt, updatedAt } = ret.attributes
  t.is(createdAt.getTime(), createdDate.getTime())
  t.is(updatedAt.getTime(), updatedDate.getTime())
})

test('cast should cast createdAt and updatedAt attributes', (t) => {
  const createdDate = '2017-05-11T18:01:43.000Z'
  const updatedDate = '2017-05-13T11:04:51.000Z'
  const type = schema({ id: 'entry' })
  const data = { attributes: { createdAt: createdDate, updatedAt: updatedDate } }

  const ret = type.cast(data)

  const { createdAt, updatedAt } = ret.attributes
  t.is(createdAt.getTime(), new Date(createdDate).getTime())
  t.is(updatedAt.getTime(), new Date(updatedDate).getTime())
})

test('cast should use createdAt when updatedAt is not specified', (t) => {
  const createdDate = new Date('2017-05-11')
  const type = schema({ id: 'entry' })
  const data = { attributes: { createdAt: createdDate } }

  const ret = type.cast(data)

  const { updatedAt } = ret.attributes
  t.is(updatedAt.getTime(), createdDate.getTime())
})

test('cast should use updatedAt when createdAt is not specified', (t) => {
  const updatedDate = new Date('2017-05-11')
  const type = schema({ id: 'entry' })
  const data = { attributes: { updatedAt: updatedDate } }

  const ret = type.cast(data)

  const { createdAt } = ret.attributes
  t.is(createdAt.getTime(), updatedDate.getTime())
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
  const type = schema({ id: 'entry', attributes })
  const data = { attributes: {
    isTrue: true,
    isFalse: false,
    isFalsy: null,
    isTruthy: 'Something truthy',
    isTrueString: 'true',
    isFalseString: 'false'
  } }

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
  const type = schema({ id: 'entry', attributes })
  const data = { attributes: {
    title: null,
    views: 'notint',
    rating: 'notfloat',
    reviewedAt: 'notdate',
    nextReview: null
  } }

  const ret = type.cast(data, { onlyMappedValues: true })

  t.deepEqual(ret.attributes, {})
})

test('cast should cast provided relationships', (t) => {
  const relationships = {
    user: 'user',
    comments: 'comment[]',
    author: 'user',
    noteInData: 'nope',
    undefInData: 'undef'
  }
  const type = schema({ id: 'entry', relationships })
  const data = { relationships: {
    user: 'johnf',
    comments: ['no1', 'no2'],
    author: null,
    unknown: 'Nope',
    undefInData: undefined
  } }
  const expected = {
    user: { id: 'johnf', type: 'user' },
    comments: [{ id: 'no1', type: 'comment' }, { id: 'no2', type: 'comment' }],
    author: null
  }

  const ret = type.cast(data)

  t.deepEqual(ret.relationships, expected)
})

test('cast should cast relationship objects and keep meta', (t) => {
  const relationships = {
    author: 'user',
    sections: 'section'
  }
  const type = schema({ id: 'entry', relationships })
  const data = { relationships: {
    author: { id: 'johnf', type: 'user', meta: { editor: true } },
    sections: [
      { id: 'news', type: 'section', meta: { pri: 1 } },
      { id: 'sports', type: 'section', meta: { pri: 2 } }
    ]
  } }
  const expected = {
    author: { id: 'johnf', type: 'user', meta: { editor: true } },
    sections: [
      { id: 'news', type: 'section', meta: { pri: 1 } },
      { id: 'sports', type: 'section', meta: { pri: 2 } }
    ]
  }

  const ret = type.cast(data)

  t.deepEqual(ret.relationships, expected)
})

test('cast should cast relationship object without type', (t) => {
  const relationships = {
    user: 'user'
  }
  const type = schema({ id: 'entry', relationships })
  const data = { relationships: {
    user: { id: 'johnf' }
  } }
  const expected = {
    user: { id: 'johnf', type: 'user' }
  }

  const ret = type.cast(data)

  t.deepEqual(ret.relationships, expected)
})

test('cast should cast relationship object with id array', (t) => {
  const relationships = {
    user: 'user'
  }
  const type = schema({ id: 'entry', relationships })
  const data = { relationships: {
    user: { id: ['johnf', 'maryk'] }
  } }
  const expected = {
    user: [
      { id: 'johnf', type: 'user' },
      { id: 'maryk', type: 'user' }
    ]
  }

  const ret = type.cast(data)

  t.deepEqual(ret.relationships, expected)
})

test('cast should cast relationship object with id array and meta', (t) => {
  const relationships = {
    user: 'user'
  }
  const type = schema({ id: 'entry', relationships })
  const data = { relationships: {
    user: { id: ['johnf', 'maryk'], meta: { editor: false } }
  } }
  const expected = {
    user: [
      { id: 'johnf', type: 'user', meta: { editor: false } },
      { id: 'maryk', type: 'user', meta: { editor: false } }
    ]
  }

  const ret = type.cast(data)

  t.deepEqual(ret.relationships, expected)
})

test('cast should include default attributes', (t) => {
  const attributes = {
    title: { type: 'string', default: 'No title' },
    views: 'integer',
    rating: { type: 'float', default: 3.0 }
  }
  const type = schema({ id: 'entry', attributes })
  const data = {}

  const ret = type.cast(data, { onlyMappedValues: false })

  t.is(ret.attributes.title, 'No title')
  t.is(ret.attributes.views, null)
  t.is(ret.attributes.rating, 3.0)
})

test('cast should not set id, type, createdAt, or updatedAt as a default attributes', (t) => {
  const type = schema({
    id: 'entry',
    attributes: {
      title: { type: 'string', default: 'No title' }
    }
  })
  const data = {}

  const ret = type.cast(data, { onlyMappedValues: false })

  t.is(ret.attributes.id, undefined)
  t.is(ret.attributes.type, undefined)
  t.true(ret.attributes.createdAt instanceof Date) // Would be null if default was used
  t.true(ret.attributes.updatedAt instanceof Date) // Would be null if default was used
})

test('cast should include default relationships', (t) => {
  const relationships = {
    user: { type: 'user', default: 'admin' },
    comments: 'comment',
    author: { type: 'user', default: null }
  }
  const type = schema({ id: 'entry', relationships })
  const data = {}
  const expected = {
    user: { id: 'admin', type: 'user' },
    author: null
  }

  const ret = type.cast(data, { onlyMappedValues: false })

  t.deepEqual(ret.relationships, expected)
})

// Tests - relationship query

test('castQueryParams should return params for rel query', (t) => {
  const data = {
    id: 'johnf',
    type: 'user',
    attributes: { genre: 'fiction' },
    relationships: { country: { id: 'no', type: 'country' } }
  }
  const type = schema({
    id: 'user',
    relationships: {
      books: {
        type: 'book',
        query: { author: 'id', section: 'genre', market: 'country' }
      }
    }
  })
  const expected = { author: 'johnf', section: 'fiction', market: 'no' }

  const ret = type.castQueryParams('books', data)

  t.deepEqual(ret, expected)
})

test('castQueryParams should return empty array when no query object', (t) => {
  const data = {
    id: 'johnf',
    type: 'user',
    attributes: { genre: 'fiction' },
    relationships: { country: { id: 'no', type: 'country' } }
  }
  const type = schema({
    id: 'user',
    relationships: {
      books: {
        type: 'book'
      }
    }
  })
  const expected = {}

  const ret = type.castQueryParams('books', data)

  t.deepEqual(ret, expected)
})

test('castQueryParams should return id array from many-relationship', (t) => {
  const data = {
    id: 'johnf',
    type: 'user',
    attributes: {},
    relationships: { genres: [
      { id: 'fiction', type: 'genre' },
      { id: 'romance', type: 'genre' }
    ] }
  }
  const type = schema({
    id: 'user',
    relationships: {
      books: {
        type: 'book',
        query: { sections: 'genres' }
      }
    }
  })
  const expected = { sections: ['fiction', 'romance'] }

  const ret = type.castQueryParams('books', data)

  t.deepEqual(ret, expected)
})

test('castQueryParams should throw at missing param value', (t) => {
  const data = { id: 'johnf', type: 'user', attributes: {}, relationships: {} }
  const type = schema({
    id: 'user',
    relationships: {
      books: {
        type: 'book',
        query: { section: 'genre' }
      }
    }
  })

  const error = t.throws(() => type.castQueryParams('books', data))

  t.is(error.message, 'Missing value for query param')
})

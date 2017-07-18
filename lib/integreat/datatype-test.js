import test from 'ava'

import datatype from './datatype'

test('should exist', (t) => {
  t.is(typeof datatype, 'function')
})

test('should return correctly formated type', (t) => {
  const type = {
    id: 'entry',
    source: 'entries',
    attributes: {
      title: {type: 'string'},
      text: {type: 'string'},
      age: {type: 'integer'}
    },
    relationships: {
      author: {type: 'user'}
    }
  }

  const ret = datatype(type)

  t.deepEqual(ret, type)
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
  const expected = {
    id: 'entry',
    source: 'entries',
    attributes: {
      title: {type: 'string'},
      age: {type: 'integer'}
    },
    relationships: {
      author: {type: 'user'}
    }
  }

  const ret = datatype(type)

  t.deepEqual(ret, expected)
})

test('should handle missing attributes and relationships', (t) => {
  const type = {
    id: 'entry',
    source: 'entries'
  }
  const expected = {
    id: 'entry',
    source: 'entries',
    attributes: {},
    relationships: {}
  }

  const ret = datatype(type)

  t.deepEqual(ret, expected)
})

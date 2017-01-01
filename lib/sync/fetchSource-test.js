import test from 'ava'
import sinon from 'sinon'
import dotProp from 'dot-prop'

import fetchSource from './fetchSource'

// Helpers

const mockdapter = {
  retrieve: () => Promise.resolve({
    data: [
      {
        id: 'item1',
        title: 'First item'
      },
      {
        id: 'item2',
        title: 'Second item'
      }
    ]
  }),

  normalize: (item, path) => Promise.resolve(dotProp.get(item, path))
}

// Tests

test('should exist', (t) => {
  t.is(typeof fetchSource, 'function')
})

test('should retrieve source', (t) => {
  const sourceDef = {
    endpoint: 'http://some.api/1.0/',
    path: 'data'
  }

  return fetchSource(sourceDef, mockdapter)

  .then((ret) => {
    t.true(Array.isArray(ret))
    t.is(ret.length, 2)
    t.is(ret[0].id, 'item1')
    t.is(ret[1].id, 'item2')
  })
})

test('should retrieve from adapter with endpoint', (t) => {
  const spydapter = {
    retrieve: sinon.stub().returns(Promise.resolve([])),
    normalize: (item) => Promise.resolve(item)
  }
  const sourceDef = {
    endpoint: 'http://some.api/1.0/'
  }

  return fetchSource(sourceDef, spydapter)

  .then(() => {
    t.true(spydapter.retrieve.calledOnce)
    t.true(spydapter.retrieve.calledWith('http://some.api/1.0/'))
  })
})

test('should return empty array when adapter return non-array', (t) => {
  const spydapter = {
    retrieve: () => Promise.resolve({}),
    normalize: (item) => Promise.resolve({})
  }
  const sourceDef = {
    endpoint: 'http://some.api/1.0/'
  }

  return fetchSource(sourceDef, spydapter)

  .then((ret) => {
    t.deepEqual(ret, [])
  })
})

test('should retrieve from path', (t) => {
  const sourceDef = {
    endpoint: 'http://some.api/1.0/',
    path: 'data'
  }

  return fetchSource(sourceDef, mockdapter)

  .then((ret) => {
    t.true(Array.isArray(ret))
  })
})

test('should map source items', (t) => {
  const mapper = (item) => Object.assign({}, item, {chars: item.title.length})
  const sourceDef = {
    endpoint: 'http://some.api/1.0/',
    path: 'data',
    map: mapper
  }

  return fetchSource(sourceDef, mockdapter)

  .then((ret) => {
    t.is(ret[0].chars, 10)
    t.is(ret[1].chars, 11)
  })
})

test('should filter source items', (t) => {
  const filter = (item) => item.id === 'item2'
  const sourceDef = {
    endpoint: 'http://some.api/1.0/',
    path: 'data',
    filter
  }

  return fetchSource(sourceDef, mockdapter)

  .then((ret) => {
    t.is(ret.length, 1)
    t.is(ret[0].id, 'item2')
  })
})

test('should filter source items with pipeline', (t) => {
  const filter = [
    (item) => item.id === 'item2',
    (item) => false
  ]
  const sourceDef = {
    endpoint: 'http://some.api/1.0/',
    path: 'data',
    filter
  }

  return fetchSource(sourceDef, mockdapter)

  .then((ret) => {
    t.is(ret.length, 0)
  })
})

test('should filter source items with pipeline - and pass', (t) => {
  const filter = [
    (item) => item.id === 'item2',
    (item) => true
  ]
  const sourceDef = {
    endpoint: 'http://some.api/1.0/',
    path: 'data',
    filter
  }

  return fetchSource(sourceDef, mockdapter)

  .then((ret) => {
    t.is(ret.length, 1)
    t.is(ret[0].id, 'item2')
  })
})

test.todo('should catch errors from adapter retrieve')

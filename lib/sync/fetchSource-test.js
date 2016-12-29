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
    endpoint: 'http://some.api/1.0/'
  }

  return fetchSource(sourceDef, mockdapter)

  .then((ret) => {
    const {data} = ret
    t.true(Array.isArray(data))
    t.is(data.length, 2)
    t.is(data[0].id, 'item1')
    t.is(data[1].id, 'item2')
  })
})

test('should retrieve from adapter with endpoint', (t) => {
  const spydapter = {
    retrieve: sinon.stub().returns(Promise.resolve({})),
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

test('should transform source items', (t) => {
  const transform = (item) => Object.assign({}, item, {chars: item.title.length})
  const sourceDef = {
    endpoint: 'http://some.api/1.0/',
    path: 'data',
    transform
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

test.todo('should catch errors from adapter retrieve')

import test from 'ava'
import sinon from 'sinon'

import retrieveSource from './retrieveSource'

// Helpers

const getGreat = () => {
  const mockdapter = {
    retrieve: () => ({
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
    })
  }

  const great = {
    getAdapter: () => mockdapter
  }

  return {great, mockdapter}
}

// Tests

test('should exist', (t) => {
  t.is(typeof retrieveSource, 'function')
})

test('should retrieve source', (t) => {
  const sourceDef = {
    type: 'mock',
    endpoint: 'http://some.api/1.0/'
  }
  const {great} = getGreat()

  const ret = retrieveSource(great, sourceDef)

  const {data} = ret
  t.true(Array.isArray(data))
  t.is(data.length, 2)
  t.is(data[0].id, 'item1')
  t.is(data[1].id, 'item2')
})

test('should get adapter from source type', (t) => {
  const sourceDef = {
    type: 'mock',
    endpoint: 'http://some.api/1.0/'
  }
  const {great} = getGreat()
  sinon.spy(great, 'getAdapter')

  retrieveSource(great, sourceDef)

  t.true(great.getAdapter.calledOnce)
  t.true(great.getAdapter.calledWith('mock'))
})

test('should retrieve from adapter with endpoint', (t) => {
  const sourceDef = {
    type: 'mock',
    endpoint: 'http://some.api/1.0/'
  }
  const {great, mockdapter} = getGreat()
  sinon.spy(mockdapter, 'retrieve')

  retrieveSource(great, sourceDef)

  t.true(mockdapter.retrieve.calledOnce)
  t.true(mockdapter.retrieve.calledWith('http://some.api/1.0/'))
})

test('should retrieve from path', (t) => {
  const sourceDef = {
    type: 'mock',
    endpoint: 'http://some.api/1.0/',
    path: 'data'
  }
  const {great} = getGreat()

  const ret = retrieveSource(great, sourceDef)

  t.true(Array.isArray(ret))
})

test('should transform source items', (t) => {
  const transform = (item) => Object.assign({}, item, {chars: item.title.length})
  const sourceDef = {
    type: 'mock',
    endpoint: 'http://some.api/1.0/',
    path: 'data',
    transform
  }
  const {great} = getGreat()

  const ret = retrieveSource(great, sourceDef)

  t.is(ret[0].chars, 10)
  t.is(ret[1].chars, 11)
})

test('should filter source items', (t) => {
  const filter = (item) => item.id === 'item2'
  const sourceDef = {
    type: 'mock',
    endpoint: 'http://some.api/1.0/',
    path: 'data',
    filter
  }
  const {great} = getGreat()

  const ret = retrieveSource(great, sourceDef)

  t.is(ret.length, 1)
  t.is(ret[0].id, 'item2')
})

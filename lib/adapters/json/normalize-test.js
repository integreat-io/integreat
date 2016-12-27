import test from 'ava'

import normalize from './normalize'

test('should exist', (t) => {
  t.is(typeof normalize, 'function')
})

test('should return source object', (t) => {
  const source = [{id: 'item1'}]

  return normalize(source)

  .then((ret) => {
    t.deepEqual(ret, source)
  })
})

test('should return object from path', (t) => {
  const source = {data: {items: [{id: 'item1'}]}}
  const path = 'data.items'

  return normalize(source, path)

  .then((ret) => {
    t.deepEqual(ret, [{id: 'item1'}])
  })
})

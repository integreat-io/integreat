import test from 'ava'

import normalize from './normalize'

test('should exist', (t) => {
  t.is(typeof normalize, 'function')
})

test('should return source object', async (t) => {
  const source = [{id: 'item1'}]

  const ret = await normalize(source)

  t.deepEqual(ret, source)
})

test('should return object from path', async (t) => {
  const source = {data: {items: [{id: 'item1'}]}}
  const path = 'data.items'

  const ret = await normalize(source, path)

  t.deepEqual(ret, [{id: 'item1'}])
})

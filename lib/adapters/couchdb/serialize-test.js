import test from 'ava'

import {serialize} from '.'

test('should exist', (t) => {
  t.is(typeof serialize, 'function')
})

test('should serialize to _id for single item', async (t) => {
  const data = {id: 'item1'}
  const expected = {_id: 'item1'}

  const ret = await serialize(data)

  t.deepEqual(ret, expected)
})

test('should serialize to _id for array', async (t) => {
  const data = [{id: 'item1'}]
  const expected = [{_id: 'item1'}]

  const ret = await serialize(data)

  t.deepEqual(ret, expected)
})

test('should set data at a path', async (t) => {
  const data = {id: 'item1'}
  const expected = {some: {path: {_id: 'item1'}}}
  const path = 'some.path'

  const ret = await serialize(data, path)

  t.deepEqual(ret, expected)
})

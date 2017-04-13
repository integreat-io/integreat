import test from 'ava'

import {normalize} from '.'

test('should exist', (t) => {
  t.is(typeof normalize, 'function')
})

test('should return source object', async (t) => {
  const data = [{id: 'item1'}]

  const ret = await normalize(data)

  t.deepEqual(ret, data)
})

test('should normalize _id for single item', async (t) => {
  const data = {_id: 'item1'}
  const expected = {id: 'item1'}

  const ret = await normalize(data)

  t.deepEqual(ret, expected)
})

test('should normalize _id for array', async (t) => {
  const data = [{_id: 'item1'}]
  const expected = [{id: 'item1'}]

  const ret = await normalize(data)

  t.deepEqual(ret, expected)
})

test('should get data from a path', async (t) => {
  const data = {some: {path: {_id: 'item1'}}}
  const expected = {id: 'item1'}
  const path = 'some.path'

  const ret = await normalize(data, path)

  t.deepEqual(ret, expected)
})

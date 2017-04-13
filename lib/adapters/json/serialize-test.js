import test from 'ava'

import {serialize} from '.'

test('should exist', (t) => {
  t.is(typeof serialize, 'function')
})

test('should return data', async (t) => {
  const data = {id: 'ent1'}

  const ret = await serialize(data)

  t.deepEqual(ret, data)
})

test('should return data at a path', async (t) => {
  const data = {id: 'ent1'}
  const path = 'some.path'

  const ret = await serialize(data, path)

  t.deepEqual(ret, {some: {path: {id: 'ent1'}}})
})

test('should treat empty string as no path', async (t) => {
  const data = {id: 'ent1'}
  const path = ''

  const ret = await serialize(data, path)

  t.deepEqual(ret, data)
})

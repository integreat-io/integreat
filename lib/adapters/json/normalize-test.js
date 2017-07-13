import test from 'ava'

import {normalize} from '.'

test('should exist', (t) => {
  t.is(typeof normalize, 'function')
})

test('should return data', async (t) => {
  const data = [{id: 'item1'}]

  const ret = await normalize(data)

  t.deepEqual(ret, data)
})

test('should return object from path', async (t) => {
  const data = {some: {path: {id: 'item1'}}}
  const path = 'some.path'

  const ret = await normalize(data, path)

  t.deepEqual(ret, {id: 'item1'})
})

test('should return object from path with array', async (t) => {
  const data = {arr: [{path: {id: 'item1'}}]}
  const path = 'arr[0].path'

  const ret = await normalize(data, path)

  t.deepEqual(ret, {id: 'item1'})
})

test('should return array from path', async (t) => {
  const data = {some: {path: [{id: 'item1'}]}}
  const path = 'some.path[]'

  const ret = await normalize(data, path)

  t.deepEqual(ret, [{id: 'item1'}])
})

test('should treat empty string as no path', async (t) => {
  const data = {data: {items: [{id: 'item1'}]}}
  const path = ''

  const ret = await normalize(data, path)

  t.deepEqual(ret, data)
})

test('should return null for nonmatching path', async (t) => {
  const data = {data: {id: 'item1'}}
  const path = 'unknown.path'

  const ret = await normalize(data, path)

  t.is(ret, null)
})

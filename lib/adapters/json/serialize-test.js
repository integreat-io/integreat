import test from 'ava'
import { compile as compilePath } from './path'

import { serialize } from '.'

test('should exist', (t) => {
  t.is(typeof serialize, 'function')
})

test('should return data', async (t) => {
  const data = { id: 'ent1' }

  const ret = await serialize(data, {})

  t.deepEqual(ret, data)
})

test('should return data at a path', async (t) => {
  const data = { id: 'ent1' }
  const path = compilePath('some.path')
  const request = { endpoint: { path } }

  const ret = await serialize(data, request)

  t.deepEqual(ret, { some: { path: { id: 'ent1' } } })
})

test('should return data at a path with array', async (t) => {
  const data = { id: 'ent1' }
  const path = compilePath('arr[0].path')
  const request = { endpoint: { path } }

  const ret = await serialize(data, request)

  t.deepEqual(ret, { arr: [{ path: { id: 'ent1' } }] })
})

test('should return object data as an array', async (t) => {
  const data = { id: 'ent1' }
  const path = compilePath('some.path[]')
  const request = { endpoint: { path } }

  const ret = await serialize(data, request)

  t.deepEqual(ret, { some: { path: [{ id: 'ent1' }] } })
})

test('should return array data as an array', async (t) => {
  const data = [{ id: 'ent1' }, { id: 'ent2' }]
  const path = compilePath('some.path[]')
  const request = { endpoint: { path } }

  const ret = await serialize(data, request)

  t.deepEqual(ret, { some: { path: [{ id: 'ent1' }, { id: 'ent2' }] } })
})

test('should treat empty string as no path', async (t) => {
  const data = { id: 'ent1' }
  const path = compilePath('')
  const request = { endpoint: { path } }

  const ret = await serialize(data, request)

  t.deepEqual(ret, data)
})

import test from 'ava'
import { compile as compilePath } from './path'

import { serialize } from '.'

test('should return request', async (t) => {
  const request = { data: { id: 'ent1' } }

  const ret = await serialize(request)

  t.deepEqual(ret, request)
})

test('should return data at a path', async (t) => {
  const data = { id: 'ent1' }
  const path = compilePath('some.path')
  const request = { endpoint: { path }, data }

  const ret = await serialize(request)

  t.deepEqual(ret.data, { some: { path: { id: 'ent1' } } })
})

test('should return data at a path with array', async (t) => {
  const data = { id: 'ent1' }
  const path = compilePath('arr[0].path')
  const request = { endpoint: { path }, data }

  const ret = await serialize(request)

  t.deepEqual(ret.data, { arr: [{ path: { id: 'ent1' } }] })
})

test('should return object data as an array', async (t) => {
  const data = { id: 'ent1' }
  const path = compilePath('some.path[]')
  const request = { endpoint: { path }, data }

  const ret = await serialize(request)

  t.deepEqual(ret.data, { some: { path: [{ id: 'ent1' }] } })
})

test('should return array data as an array', async (t) => {
  const data = [{ id: 'ent1' }, { id: 'ent2' }]
  const path = compilePath('some.path[]')
  const request = { endpoint: { path }, data }

  const ret = await serialize(request)

  t.deepEqual(ret.data, { some: { path: [{ id: 'ent1' }, { id: 'ent2' }] } })
})

test('should treat empty string as no path', async (t) => {
  const data = { id: 'ent1' }
  const path = compilePath('')
  const request = { endpoint: { path }, data }

  const ret = await serialize(request)

  t.deepEqual(ret.data, data)
})

import test from 'ava'
import { compile as compilePath } from './path'

import { normalize } from '.'

test('should return response', async (t) => {
  const response = { data: [{ id: 'item1' }] }

  const ret = await normalize(response, {})

  t.deepEqual(ret, response)
})

test('should return object from endpoint path', async (t) => {
  const data = { some: { path: { id: 'item1' } } }
  const path = compilePath('some.path')
  const request = { endpoint: { path } }

  const ret = await normalize({ data }, request)

  t.deepEqual(ret, { data: { id: 'item1' } })
})

test('should return object from path with array', async (t) => {
  const data = { arr: [{ path: { id: 'item1' } }] }
  const path = compilePath('arr[0].path')
  const request = { endpoint: { path } }

  const ret = await normalize({ data }, request)

  t.deepEqual(ret, { data: { id: 'item1' } })
})

test('should return array from path', async (t) => {
  const data = { some: { path: [{ id: 'item1' }] } }
  const path = compilePath('some.path[]')
  const request = { endpoint: { path } }

  const ret = await normalize({ data }, request)

  t.deepEqual(ret, { data: [{ id: 'item1' }] })
})

test('should treat empty string as no path', async (t) => {
  const response = { items: [{ id: 'item1' }] }
  const path = compilePath('')
  const request = { endpoint: { path } }

  const ret = await normalize(response, request)

  t.deepEqual(ret, response)
})

test('should return null for nonmatching path', async (t) => {
  const data = { data: { id: 'item1' } }
  const path = compilePath('unknown.path')
  const request = { endpoint: { path } }

  const ret = await normalize({ data }, request)

  t.deepEqual(ret, { data: null })
})

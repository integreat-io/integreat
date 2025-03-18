import test from 'node:test'
import assert from 'node:assert/strict'
import { TypedData } from '../types.js'

import { deepClone, deepMerge, deepMergeItems } from './deep.js'

// Tests -- deepClone

test('should clone object', () => {
  const obj: TypedData = { id: 'ent1', $type: 'entry' }

  const ret = deepClone(obj)

  assert.deepEqual(ret, obj)
  ret.changed = true
  assert.equal(!!obj.changed, false)
})

test('should deep clone object', () => {
  const obj: TypedData[] = [
    { id: 'ent1', $type: 'entry', meta: { section: ['news', 'sports'] } },
  ]

  const ret = deepClone(obj)

  assert.deepEqual(ret, obj)
  ;(ret[0].meta as Record<string, unknown>).changed = true
  assert.equal(!!(obj[0].meta as Record<string, unknown>).changed, false)
})

// Tests -- deepMerge

test('should deep merge objects', () => {
  const obj1 = {
    id: 'ent1',
    $type: 'entry',
    title: 'Entry 1',
    meta: { section: ['news', 'sports'] },
  }
  const obj2 = {
    id: 'ent1',
    $type: 'entry',
    author: 'johnf',
    meta: { archived: true },
  }
  const expected = {
    id: 'ent1',
    $type: 'entry',
    title: 'Entry 1',
    author: 'johnf',
    meta: { section: ['news', 'sports'], archived: true },
  }

  const ret = deepMerge(obj1, obj2)

  assert.deepEqual(ret, expected)
})

test('should deep merge and prioritize the second object', () => {
  const obj1 = {
    id: 'ent1',
    $type: 'entry',
    title: 'Entry 1',
    meta: { section: ['news', 'sports'], archived: false },
  }
  const obj2 = {
    id: 'ent1',
    $type: 'entry',
    title: 'Entry 1 - changed',
    author: 'johnf',
    meta: { archived: true },
  }
  const expected = {
    id: 'ent1',
    $type: 'entry',
    title: 'Entry 1 - changed',
    author: 'johnf',
    meta: { section: ['news', 'sports'], archived: true },
  }

  const ret = deepMerge(obj1, obj2)

  assert.deepEqual(ret, expected)
})

test('should not merge arrays', () => {
  const obj1 = {
    id: 'ent1',
    section: ['news', 'sports'],
  }
  const obj2 = {
    id: 'ent1',
    $type: 'entry',
    section: ['sports'],
  }
  const expected = {
    id: 'ent1',
    $type: 'entry',
    section: ['sports'],
  }

  const ret = deepMerge(obj1, obj2)

  assert.deepEqual(ret, expected)
})

// Tests -- deepMergeItems

test('should deep merge items of an array in the same positions', () => {
  const arr1 = [
    { id: 'ent1', $type: 'entry', title: 'Entry 1' },
    { id: 'ent2', $type: 'entry', title: 'Entry 2' },
  ]
  const arr2 = [
    { id: 'ent1', $type: 'entry', title: 'Entry 1 - changed' },
    { id: 'ent2', $type: 'entry', author: 'katyf' },
  ]
  const expected = [
    { id: 'ent1', $type: 'entry', title: 'Entry 1 - changed' },
    { id: 'ent2', $type: 'entry', title: 'Entry 2', author: 'katyf' },
  ]

  const ret = deepMergeItems(arr1, arr2)

  assert.deepEqual(ret, expected)
})

test('should deep merge two objects not in arrays', () => {
  const obj1 = { id: 'ent1', $type: 'entry', title: 'Entry 1', author: 'johnf' }
  const obj2 = { id: 'ent1', $type: 'entry', title: 'Entry 1 - changed' }
  const expected = {
    id: 'ent1',
    $type: 'entry',
    title: 'Entry 1 - changed',
    author: 'johnf',
  }

  const ret = deepMergeItems(obj1, obj2)

  assert.deepEqual(ret, expected)
})

test('should throw when only one is an array', () => {
  const arr1 = [
    { id: 'ent1', $type: 'entry', title: 'Entry 1' },
    { id: 'ent2', $type: 'entry', title: 'Entry 2' },
  ]
  const arr2 = { id: 'ent1', $type: 'entry', title: 'Entry 1 - changed' }
  const expectedErrors = {
    name: 'Error',
    message: 'Cannot merge array with non-array',
  }

  assert.throws(() => deepMergeItems(arr1, arr2), expectedErrors)
})

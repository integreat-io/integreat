import test from 'ava'

import {get, set, remove} from './repository'

test('get should exist', (t) => {
  t.is(typeof get, 'function')
})

test('set should exist', (t) => {
  t.is(typeof set, 'function')
})

test('should return null for unknown key', (t) => {
  const rep = new Map()

  const ret = get(rep, 'unknown')

  t.is(ret, null)
})

test('should set and get value', (t) => {
  const value = 'The value'
  const rep = new Map()

  set(rep, 'value', value)
  const ret = get(rep, 'value')

  t.is(ret, value)
})

test('should overwrite existing key', (t) => {
  const rep = new Map()
  set(rep, 'value', 'First')

  set(rep, 'value', 'Second')

  const ret = get(rep, 'value')
  t.is(ret, 'Second')
})

test('remove should exist', (t) => {
  t.is(typeof remove, 'function')
})

test('should remove value', (t) => {
  const rep = new Map()
  set(rep, 'value', 'Something')

  remove(rep, 'value')

  const ret = get(rep, 'value')
  t.is(ret, null)
})

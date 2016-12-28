import test from 'ava'

import {storeItem, fetchItem, fetchByType} from './index'

test('storeItem should exist', (t) => {
  t.is(typeof storeItem, 'function')
})

test('fetchItem should exist', (t) => {
  t.is(typeof fetchItem, 'function')
})

test('fetchByType should exist', (t) => {
  t.is(typeof fetchByType, 'function')
})

import test from 'ava'

import {retrieve, normalize} from './index'

test('retrieve should exist', (t) => {
  t.is(typeof retrieve, 'function')
})

test('normalize should exist', (t) => {
  t.is(typeof normalize, 'function')
})

import test from 'ava'

import Integreat from '.'

// Tests

test('should have version and create', t => {
  t.is(typeof Integreat.version, 'string')
  t.is(typeof Integreat.create, 'function')
})

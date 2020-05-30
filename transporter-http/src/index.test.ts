import test from 'ava'

import pkg from '.'

// Tests

test('should have http transporter', (t) => {
  t.is(typeof pkg, 'object')
  t.is(typeof pkg.transporters.http, 'object')
  t.not(pkg.transporters, null)
})

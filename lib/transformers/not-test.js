import test from 'ava'

import not from './not'

// Tests -- from service

test('should perform logical not', (t) => {
  const ret1 = not(true)
  const ret2 = not(false)

  t.false(ret1)
  t.true(ret2)
})

test('should treat value as truthy or falsy', (t) => {
  const ret1 = not(null)
  const ret2 = not('something')

  t.true(ret1)
  t.false(ret2)
})

// Tests -- to service

test('should perform logical not to service', (t) => {
  const ret1 = not.rev(true)
  const ret2 = not.rev(false)

  t.false(ret1)
  t.true(ret2)
})

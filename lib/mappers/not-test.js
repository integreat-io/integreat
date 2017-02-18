import test from 'ava'

import not from './not'

test('from should exist', (t) => {
  t.is(typeof not.from, 'function')
})

test('from should perform logical not', (t) => {
  const ret1 = not.from(true)
  const ret2 = not.from(false)

  t.false(ret1)
  t.true(ret2)
})

test('from should treat value as truthy or falsy', (t) => {
  const ret1 = not.from(null)
  const ret2 = not.from('something')

  t.true(ret1)
  t.false(ret2)
})

test('to should exist', (t) => {
  t.is(typeof not.to, 'function')
})

test('to should perform logical not', (t) => {
  const ret1 = not.to(true)
  const ret2 = not.to(false)

  t.false(ret1)
  t.true(ret2)
})

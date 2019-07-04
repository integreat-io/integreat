import test from 'ava'

import trim from './trim'

// Tests -- from service

test('should trim from service', (t) => {
  t.is(trim(' Space on each side '), 'Space on each side')
  t.is(trim(' Space in front'), 'Space in front')
  t.is(trim('Space on the end '), 'Space on the end')
  t.is(trim('No space'), 'No space')
  t.is(trim(' '), '')
})

test('should not touch things that are not string from service', (t) => {
  t.is(trim(3), 3)
  t.is(trim(true), true)
  t.is(trim(null), null)
  t.is(trim(undefined), undefined)
  t.deepEqual(trim({}), {})
})

// Tests -- to service

test('should trim to service', (t) => {
  t.is(trim.rev(' Space on each side '), 'Space on each side')
  t.is(trim.rev(' Space in front'), 'Space in front')
  t.is(trim.rev('Space on the end '), 'Space on the end')
  t.is(trim.rev('No space'), 'No space')
  t.is(trim.rev(' '), '')
})

test('should not touch things that are not string to service', (t) => {
  t.is(trim.rev(3), 3)
  t.is(trim.rev(true), true)
  t.is(trim.rev(null), null)
  t.is(trim.rev(undefined), undefined)
  t.deepEqual(trim.rev({}), {})
})

import test from 'ava'

import defaultTransforms from '.'

test('should exist', (t) => {
  t.is(typeof defaultTransforms, 'function')
})

test('should return object with all default transforms', (t) => {
  const transforms = defaultTransforms()

  t.truthy(transforms)
  t.is(typeof transforms.date, 'function')
  t.is(typeof transforms.float, 'function')
  t.is(typeof transforms.integer, 'function')
  t.is(typeof transforms.not, 'object')
  t.is(typeof transforms.not.to, 'function')
  t.is(typeof transforms.not.from, 'function')
})

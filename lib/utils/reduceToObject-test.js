import test from 'ava'

import reduceToObject from './reduceToObject'

test('should exist', (t) => {
  t.is(typeof reduceToObject, 'function')
})

test('should reduce array of objects to object', (t) => {
  const obj1 = {id: 'obj1'}
  const obj2 = {id: 'obj2'}
  const objects = [obj1, obj2]
  const expected = {obj1, obj2}

  const ret = objects.reduce(reduceToObject('id'), {})

  t.deepEqual(ret, expected)
})

test('should skip objects without key', (t) => {
  const obj1 = {id: 'obj1'}
  const obj2 = {}
  const objects = [obj1, obj2]
  const expected = {obj1}

  const ret = objects.reduce(reduceToObject('id'), {})

  t.deepEqual(ret, expected)
})

import test from 'ava'

import path from '.'

test('should exist', (t) => {
  t.truthy(path)
  t.is(typeof path.compile, 'function')
  t.is(typeof path.get, 'function')
  t.is(typeof path.set, 'function')
  t.is(typeof path.compare, 'function')
})

test('should compile, set, and get', (t) => {
  const pathStr = 'data.items[0].title'
  const value = 'The title'
  const expected = {data: {items: [{title: 'The title'}]}}

  const pathComp = path.compile(pathStr)
  const object = path.set({}, pathComp, value)
  const ret = path.get(object, pathComp)

  t.deepEqual(object, expected)
  t.is(ret, value)
})

test('should compile and compare', (t) => {
  const pathStr = 'data.items[0].title="The title"'
  const object = {data: {items: [{title: 'The title'}]}}

  const pathComp = path.compile(pathStr)
  const ret = path.compare(object, pathComp)

  t.true(ret)
})

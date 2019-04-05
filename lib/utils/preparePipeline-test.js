import test from 'ava'

import { preparePipeline } from './preparePipeline'

test('should exist', (t) => {
  t.is(typeof preparePipeline, 'function')
})

test('should set replace keys with functions', (t) => {
  const pipeline = [() => '1', 'two', null, 'unknown']
  const collection = { two: { from: () => '2' } }

  const ret = preparePipeline(pipeline, collection)

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(typeof ret[0], 'function')
  t.is(ret[0](), '1')
  t.is(typeof ret[1], 'object')
  t.is(typeof ret[1].from, 'function')
  t.is(ret[1].from(), '2')
})

test('should treat key string as pipeline of one', (t) => {
  const pipeline = 'two'
  const collection = { two: { from: () => '2' } }

  const ret = preparePipeline(pipeline, collection)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0], collection.two)
})

test('should treat function as pipeline of one', (t) => {
  const pipeline = () => '1'
  const collection = {}

  const ret = preparePipeline(pipeline, collection)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0], pipeline)
})

test('should not treat null as pipeline of one', (t) => {
  const pipeline = null
  const collection = {}

  const ret = preparePipeline(pipeline, collection)

  t.true(Array.isArray(ret))
  t.is(ret.length, 0)
})

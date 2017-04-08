import test from 'ava'

import retrieveFromPath from './retrieveFromPath'

const item = {first: 1, second: {half: 2.5}}

test('should exist', (t) => {
  t.is(typeof retrieveFromPath, 'function')
})

test('should get values from object', (t) => {
  t.is(retrieveFromPath(item, 'first'), 1)
  t.is(retrieveFromPath(item, 'second.half'), 2.5)
})

test('should return undefined when path does not match object', (t) => {
  t.is(retrieveFromPath(item, 'first.half'), undefined)
})

test('should return object when no path is given', (t) => {
  t.is(retrieveFromPath(item), item)
})

test('should return object when empty string is given as path', (t) => {
  t.is(retrieveFromPath(item, ''), item)
})

test('should return null when no object is given', (t) => {
  t.is(retrieveFromPath(null), null)
})

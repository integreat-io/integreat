import test from 'ava'
import Integreat from '../Integreat'

import loadDefaults from './loadDefaults'

test('should exist', (t) => {
  t.is(typeof loadDefaults, 'function')
})

test('should load default adapters', (t) => {
  const great = new Integreat()

  loadDefaults(great)

  t.not(great.getAdapter('json'), null)
})

test('should load mappers', (t) => {
  const great = new Integreat()

  loadDefaults(great)

  t.is(typeof great.getMapper('date'), 'function')
  t.is(typeof great.getMapper('float'), 'function')
  t.is(typeof great.getMapper('integer'), 'function')
})

test('should load auth strategies', (t) => {
  const great = new Integreat()

  loadDefaults(great)

  t.is(typeof great.getAuthStrategy('token'), 'function')
})

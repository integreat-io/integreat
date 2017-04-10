import test from 'ava'
import Integreat from '../integreat'

import loadDefaults from './loadDefaults'

test('should exist', (t) => {
  t.is(typeof loadDefaults, 'function')
})

test('should load default adapters', (t) => {
  const great = new Integreat()

  loadDefaults(great)

  t.not(great.adapters.get('json'), null)
})

test('should load mappers', (t) => {
  const great = new Integreat()

  loadDefaults(great)

  t.is(typeof great.mappers.get('date'), 'function')
  t.is(typeof great.mappers.get('float'), 'function')
  t.is(typeof great.mappers.get('integer'), 'function')
  t.is(typeof great.mappers.get('not').from, 'function')
})

test('should load auth strategies', (t) => {
  const great = new Integreat()

  loadDefaults(great)

  t.is(typeof great.authStrats.get('token'), 'function')
  t.is(typeof great.authStrats.get('options'), 'function')
})

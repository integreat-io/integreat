import test from 'ava'

import sourceIdFromType from './sourceIdFromType'

test('should exist', (t) => {
  t.is(typeof sourceIdFromType, 'function')
})

test('should get source id', (t) => {
  const types = {
    entry: {source: 'entries'}
  }

  const sourceId = sourceIdFromType('entry', types)

  t.is(sourceId, 'entries')
})

test('should return null type when not found', (t) => {
  const types = {}

  const sourceId = sourceIdFromType('unknown', types)

  t.is(sourceId, null)
})

test('should handle missing types object', (t) => {
  const sourceId = sourceIdFromType('entry', null)

  t.is(sourceId, null)
})

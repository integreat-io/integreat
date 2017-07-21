import test from 'ava'

import getSource from './getSource'

test('should exist and return function', (t) => {
  t.is(typeof getSource, 'function')
  t.is(typeof getSource(), 'function')
})

test('should return source from type', (t) => {
  const entries = {}
  const sources = {entries}
  const datatypes = {entry: {id: 'entry', source: 'entries'}}

  const ret = getSource(datatypes, sources)('entry')

  t.truthy(ret)
  t.is(ret, entries)
})

test('should return source from source id', (t) => {
  const entries = {}
  const sources = {entries}
  const datatypes = {}

  const ret = getSource(datatypes, sources)('entry', 'entries')

  t.truthy(ret)
  t.is(ret, entries)
})

test('should return null when type not found', (t) => {
  const sources = {}
  const datatypes = {}

  t.notThrows(() => {
    const ret = getSource(datatypes, sources)('unknown')

    t.is(ret, null)
  })
})

test('should return null when source not found', (t) => {
  const sources = {}
  const datatypes = {}

  t.notThrows(() => {
    const ret = getSource(datatypes, sources)('entry', 'unknown')

    t.is(ret, null)
  })
})

test('should return null when source not found, regardless of type', (t) => {
  const sources = {entries: {}}
  const datatypes = {entry: {id: 'entry', source: 'entries'}}

  t.notThrows(() => {
    const ret = getSource(datatypes, sources)('entry', 'unknown')

    t.is(ret, null)
  })
})

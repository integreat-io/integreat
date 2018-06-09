import test from 'ava'

import getService from './getService'

test('should exist and return function', (t) => {
  t.is(typeof getService, 'function')
  t.is(typeof getService(), 'function')
})

test('should return service from type', (t) => {
  const entries = {}
  const services = {entries}
  const datatypes = {entry: {id: 'entry', service: 'entries'}}

  const ret = getService(datatypes, services)('entry')

  t.truthy(ret)
  t.is(ret, entries)
})

test('should return service from service id', (t) => {
  const entries = {}
  const services = {entries}
  const datatypes = {}

  const ret = getService(datatypes, services)('entry', 'entries')

  t.truthy(ret)
  t.is(ret, entries)
})

test('should return null when type not found', (t) => {
  const services = {}
  const datatypes = {}

  t.notThrows(() => {
    const ret = getService(datatypes, services)('unknown')

    t.is(ret, null)
  })
})

test('should return null when service not found', (t) => {
  const services = {}
  const datatypes = {}

  t.notThrows(() => {
    const ret = getService(datatypes, services)('entry', 'unknown')

    t.is(ret, null)
  })
})

test('should return null when service not found, regardless of type', (t) => {
  const services = {entries: {}}
  const datatypes = {entry: {id: 'entry', service: 'entries'}}

  t.notThrows(() => {
    const ret = getService(datatypes, services)('entry', 'unknown')

    t.is(ret, null)
  })
})

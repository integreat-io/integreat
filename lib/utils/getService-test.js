import test from 'ava'

import getService from './getService'

// Setup

const schemas = {
  entry: { id: 'entry', plural: 'entries', service: 'entries' }
}

// Tests

test('should return service from type', (t) => {
  const entries = {}
  const services = { entries }

  const ret = getService(schemas, services)('entry')

  t.is(ret, entries)
})

test('should return service from service id', (t) => {
  const entries = {}
  const services = { entries }

  const ret = getService(schemas, services)('entry', 'entries')

  t.is(ret, entries)
})

test('should return null when type not found', (t) => {
  const services = {}

  t.notThrows(() => {
    const ret = getService(schemas, services)('unknown')

    t.is(ret, null)
  })
})

test('should return null when service not found', (t) => {
  const services = {}

  t.notThrows(() => {
    const ret = getService(schemas, services)('entry', 'unknown')

    t.is(ret, null)
  })
})

test('should return null when service not found, regardless of type', (t) => {
  const services = { entries: {} }

  t.notThrows(() => {
    const ret = getService(schemas, services)('entry', 'unknown')

    t.is(ret, null)
  })
})

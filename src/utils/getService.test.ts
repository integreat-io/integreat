import test from 'ava'
import createSchema from '../schema/index.js'
import Service from '../service/Service.js'
import type { Transporter } from '../types.js'

import getService from './getService.js'

// Setup

const schemas = {
  entry: createSchema({ id: 'entry', plural: 'entries', service: 'entries' }),
}

const transporters = {
  http: {} as Transporter,
}

const entries = new Service(
  {
    id: 'entries',
    transporter: 'http',
    endpoints: [],
  },
  { schemas, transporters }
)

// Tests

test('should return service from type', (t) => {
  const services = { entries }

  const ret = getService(schemas, services)('entry')

  t.is(ret, entries)
})

test('should return service from first type that matches', (t) => {
  const services = { entries }

  const ret = getService(schemas, services)(['unknown', 'entry'])

  t.is(ret, entries)
})

test('should return service from service id', (t) => {
  const services = { entries }

  const ret = getService(schemas, services)('entry', 'entries')

  t.is(ret, entries)
})

test('should return undefined when type not found', (t) => {
  const services = {}

  t.notThrows(() => {
    const ret = getService(schemas, services)('unknown')

    t.is(ret, undefined)
  })
})

test('should return undefined when service not found', (t) => {
  const services = {}

  t.notThrows(() => {
    const ret = getService(schemas, services)('entry', 'unknown')

    t.is(ret, undefined)
  })
})

test('should return undefined when service not found, regardless of type', (t) => {
  const services = { entries }

  t.notThrows(() => {
    const ret = getService(schemas, services)('entry', 'unknown')

    t.is(ret, undefined)
  })
})

test('should return undefined when no schemas and no serviceId', (t) => {
  const services = { entries }

  const ret = getService(undefined, services)('entry')

  t.is(ret, undefined)
})

test('should return undefined when no services', (t) => {
  const ret = getService(schemas)('entry')

  t.is(ret, undefined)
})

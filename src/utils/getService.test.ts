import test from 'node:test'
import assert from 'node:assert/strict'
import mapTransform from 'map-transform'
import Schema from '../schema/Schema.js'
import Service from '../service/Service.js'
import type { Transporter } from '../types.js'

import getService from './getService.js'

// Setup

const schemas = new Map()
schemas.set(
  'entry',
  new Schema({ id: 'entry', plural: 'entries', service: 'entries' }),
)

const transporters = {
  http: {} as Transporter,
}

const entries = new Service(
  {
    id: 'entries',
    transporter: 'http',
    endpoints: [],
  },
  { schemas, transporters, mapTransform },
)

// Tests

test('should return service from type', () => {
  const services = { entries }

  const ret = getService(schemas, services)('entry')

  assert.equal(ret, entries)
})

test('should return service from first type that matches', () => {
  const services = { entries }

  const ret = getService(schemas, services)(['unknown', 'entry'])

  assert.equal(ret, entries)
})

test('should return service from service id', () => {
  const services = { entries }

  const ret = getService(schemas, services)('entry', 'entries')

  assert.equal(ret, entries)
})

test('should return undefined when type not found', () => {
  const services = {}

  assert.doesNotThrow(() => {
    const ret = getService(schemas, services)('unknown')

    assert.equal(ret, undefined)
  })
})

test('should return undefined when service not found', () => {
  const services = {}

  assert.doesNotThrow(() => {
    const ret = getService(schemas, services)('entry', 'unknown')

    assert.equal(ret, undefined)
  })
})

test('should return undefined when service not found, regardless of type', () => {
  const services = { entries }

  assert.doesNotThrow(() => {
    const ret = getService(schemas, services)('entry', 'unknown')

    assert.equal(ret, undefined)
  })
})

test('should return undefined when no schemas and no serviceId', () => {
  const services = { entries }

  const ret = getService(undefined, services)('entry')

  assert.equal(ret, undefined)
})

test('should return undefined when no services', () => {
  const ret = getService(schemas)('entry')

  assert.equal(ret, undefined)
})

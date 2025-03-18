import test from 'node:test'
import assert from 'node:assert/strict'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'

import Integreat from '../../index.js'

// Tests

test('should throw on unknown transformer', () => {
  const resourcesWithoutTransformers = { ...resources, transformers: {} }
  const expectedError = {
    name: 'Error',
    message:
      "Transform operator was given the unknown transformer id 'isoDate'",
  }

  assert.throws(
    () => Integreat.create(defs, resourcesWithoutTransformers),
    expectedError,
  )
})

test('should throw on unknown mutations', () => {
  const defsWithoutMutations = { ...defs, mutations: {} }
  const expectedError = {
    name: 'Error',
    message: "Failed to apply pipeline 'api-entry'. Unknown pipeline",
  }

  assert.throws(
    () => Integreat.create(defsWithoutMutations, resources),
    expectedError,
  )
})

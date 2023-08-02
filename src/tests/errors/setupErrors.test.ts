import test from 'ava'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'

import Integreat from '../../index.js'

// Tests

test('should throw on unknown transformer', (t) => {
  const resourcesWithoutTransformers = { ...resources, transformers: {} }

  const error = t.throws(() =>
    Integreat.create(defs, resourcesWithoutTransformers)
  )

  t.true(error instanceof Error)
  t.is(
    error?.message,
    "Transform operator was given the unknown transformer id 'isoDate'"
  )
})

test('should throw on unknown mutations', (t) => {
  const defsWithoutMutations = { ...defs, mutations: {} }

  const error = t.throws(() =>
    Integreat.create(defsWithoutMutations, resources)
  )

  t.true(error instanceof Error)
  t.is(error?.message, "Failed to apply pipeline 'api-entry'. Unknown pipeline")
})

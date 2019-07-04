const { compose, map } = require('ramda')
import is = require('@sindresorhus/is')
import { transform, fwd, rev, alt, value, fixed, set } from 'map-transform'
import { preparePipeline, prepareRevPipeline } from '../utils/preparePipeline'

const pathPipelineSetAlts = ([primary, ...alts]) => [
  primary,
  ...alts.map(
    compose(
      fwd,
      alt
    )
  )
]

const pathToPipeline = path =>
  is.array(path) ? pathPipelineSetAlts(path) : [path]

const createSubMapping = (sub, transformers, switchTransforms) =>
  switchTransforms && typeof sub === 'string'
    ? set(sub)
    : normalizeFieldMapping(transformers, switchTransforms)(sub)

const createFieldPipeline = (
  {
    path,
    transform: transformDef = [],
    transformTo: transformToDef = null,
    default: defValue,
    const: constValue,
    sub
  },
  transformers,
  switchTransforms
) => {
  const transformPipeline = preparePipeline(transformDef, transformers)
  const revTransformPipeline = prepareRevPipeline(
    transformToDef,
    transformPipeline,
    transformers
  )
  return [
    ...pathToPipeline(path),
    typeof constValue !== 'undefined' ? fixed(constValue) : null,
    typeof defValue !== 'undefined' ? alt(value(defValue)) : null,
    sub && switchTransforms
      ? createSubMapping(sub, transformers, switchTransforms)
      : null,
    ...(switchTransforms ? revTransformPipeline : transformPipeline).map(
      compose(
        fwd,
        transform
      )
    ),
    ...(switchTransforms ? transformPipeline : revTransformPipeline).map(
      compose(
        rev,
        transform
      )
    ),
    sub && !switchTransforms
      ? createSubMapping(sub, transformers, switchTransforms)
      : null
  ].filter(Boolean)
}

export const normalizeFieldMapping = (
  transformers = {},
  switchTransforms = false
) => def =>
  is.string(def) || is.array(def)
    ? pathToPipeline(def)
    : createFieldPipeline(def, transformers, switchTransforms)

export const normalizeMapping = (mapping, transformers = {}) =>
  map(normalizeFieldMapping(transformers), mapping)

export const normalizeMappingWithSwitchedTransforms = (
  mapping,
  transformers = {}
) => map(normalizeFieldMapping(transformers, true), mapping)

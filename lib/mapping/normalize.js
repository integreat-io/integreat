const { compose, map } = require('ramda')
const is = require('@sindresorhus/is')
const { transform, fwd, rev, alt, value } = require('map-transform')
const { preparePipeline, prepareRevPipeline } = require('../utils/preparePipeline')

const pathPipelineSetAlts = ([primary, ...alts]) => [
  primary,
  ...alts.map(alt)
]

const pathToPipeline = (path) => is.array(path)
  ? pathPipelineSetAlts(path)
  : [path]

const createFieldPipeline = ({
  path,
  transform: transformDef = [],
  transformTo: transformToDef = null,
  default: defValue
}, transformers, switchTransforms) => {
  const transformPipeline = preparePipeline(transformDef, transformers)
  const revTransformPipeline = prepareRevPipeline(transformToDef, transformPipeline, transformers)
  return [
    ...pathToPipeline(path),
    (defValue) ? alt(value(defValue)) : undefined,
    ...((switchTransforms) ? revTransformPipeline : transformPipeline).map(compose(fwd, transform)),
    ...((switchTransforms) ? transformPipeline : revTransformPipeline).map(compose(rev, transform))
  ].filter(Boolean)
}
const normalizeFieldMapping = (transformers = {}, switchTransforms = false) => (def) => (is.string(def) || is.array(def))
  ? pathToPipeline(def)
  : createFieldPipeline(def, transformers, switchTransforms)

const normalizeMapping = (mapping, transformers = {}) =>
  map(normalizeFieldMapping(transformers), mapping)

const normalizeMappingWithSwitchedTransforms = (mapping, transformers = {}) =>
  map(normalizeFieldMapping(transformers, true), mapping)

module.exports = {
  normalizeMapping,
  normalizeFieldMapping,
  normalizeMappingWithSwitchedTransforms
}

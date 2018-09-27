const { compose, map } = require('ramda')
const is = require('@sindresorhus/is')
const { transform, fwd, alt, value } = require('map-transform')
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
}, transformers) => {
  const transformPipeline = preparePipeline(transformDef, transformers)
  return [
    ...pathToPipeline(path),
    (defValue) ? alt(value(defValue)) : undefined,
    ...transformPipeline.map(compose(fwd, transform)),
    ...prepareRevPipeline(transformToDef, transformPipeline, transformers)
  ].filter(Boolean)
}
const normalizeFieldMapping = (transformers = {}) => (def) => (is.string(def) || is.array(def))
  ? pathToPipeline(def)
  : createFieldPipeline(def, transformers)

const normalizeMapping = (mapping, transformers = {}) => map(normalizeFieldMapping(transformers), mapping)

module.exports = {
  normalizeMapping,
  normalizeFieldMapping
}

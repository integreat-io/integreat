const { compose, map } = require('ramda')
const is = require('@sindresorhus/is')
const { transform, fwd, rev, alt, value, root } = require('map-transform')
const preparePipeline = require('../utils/preparePipeline')

const dollarToRoot = (path) => path && path.startsWith('$')
  ? fwd(root(path.substr(1)))
  : path

const pathPipelineSetAlts = ([primary, ...alts]) => [
  primary,
  ...alts.map(alt)
]

const pathToPipeline = (path) => is.array(path)
  ? pathPipelineSetAlts(path.map(dollarToRoot))
  : [dollarToRoot(path)]

const prepareRevPipeline = (transformToDef, transformPipeline, transformers) => (transformToDef)
  ? preparePipeline(transformToDef, transformers).map(compose(rev, transform))
  : transformPipeline.map((fn) => (fn.rev) ? rev(transform(fn.rev)) : null).filter(Boolean)

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

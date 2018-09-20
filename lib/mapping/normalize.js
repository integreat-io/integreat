const { compose, map } = require('ramda')
const is = require('@sindresorhus/is')
const { transform, fwd, rev, alt, value } = require('map-transform')

const pathPipelineSetAlts = ([primary, ...alts]) => [
  primary,
  ...alts.map(alt)
]

const pathToPipeline = (path) => is.array(path)
  ? pathPipelineSetAlts(path)
  : [path]

const createFieldPipeline = ({ path, format = [], default: defValue }) => [
  ...pathToPipeline(path),
  (defValue) ? alt(value(defValue)) : undefined,
  ...[].concat(format).map(compose(fwd, transform)),
  ...[].concat(format).map((fn) => (fn.rev) ? rev(transform(fn.rev)) : null).filter(Boolean)
].filter(Boolean)

const normalizeFieldMapping = (def) => (is.string(def) || is.array(def))
  ? pathToPipeline(def)
  : createFieldPipeline(def)

const normalizeMapping = map(normalizeFieldMapping)

module.exports = {
  normalizeMapping,
  normalizeFieldMapping
}

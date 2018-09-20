const { compose, map } = require('ramda')
const { transform, fwd, rev, alt, value } = require('map-transform')

const createFieldPipeline = ({ path, format = [], default: defValue }) => [
  path,
  (defValue) ? alt(value(defValue)) : undefined,
  ...[].concat(format).map(compose(fwd, transform)),
  ...[].concat(format).map((fn) => (fn.rev) ? rev(transform(fn.rev)) : null).filter(Boolean)
].filter(Boolean)

const normalizeFieldMapping = (def) => (typeof def === 'string')
  ? [def]
  : createFieldPipeline(def)

const normalizeMapping = map(normalizeFieldMapping)

module.exports = {
  normalizeMapping,
  normalizeFieldMapping
}

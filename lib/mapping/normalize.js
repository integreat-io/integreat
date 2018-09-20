const { compose, map } = require('ramda')
const is = require('@sindresorhus/is')
const { transform, fwd, rev, alt, value, root } = require('map-transform')

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

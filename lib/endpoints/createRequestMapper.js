const { mapTransform, set } = require('map-transform')
const { normalizeMapping } = require('../mapping/normalize')

function createRequestMapper ({ requestPath, requestMapping }) {
  const def = [
    (requestMapping) ? normalizeMapping(requestMapping) : 'data'
  ]

  if (requestPath) {
    def.push(set(requestPath))
  }

  return mapTransform(def)
}

module.exports = createRequestMapper

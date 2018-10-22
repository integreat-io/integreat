const { mapTransform, set } = require('map-transform')
const { normalizeMapping } = require('../mapping/normalize')

function createRequestMapper ({ requestMapping }) {
  if (!requestMapping) {
    return mapTransform('data')
  }
  return (typeof requestMapping === 'string')
    ? mapTransform(['data', set(requestMapping)])
    : mapTransform(normalizeMapping(requestMapping))
}

module.exports = createRequestMapper

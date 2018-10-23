const { mapTransform, set } = require('map-transform')
const { normalizeMapping } = require('../mapping/normalize')

function createResponseMapper ({ responseMapping }, { transformers } = {}) {
  if (responseMapping) {
    return (typeof responseMapping === 'string')
      ? mapTransform([`data.${responseMapping}`, set('data')])
      : mapTransform(['data', normalizeMapping(responseMapping, transformers)])
  }
  return ({ data }) => ({ data })
}

module.exports = createResponseMapper

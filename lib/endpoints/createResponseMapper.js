const { mapTransform, set } = require('map-transform')
const { normalizeMapping } = require('../mapping/normalize')

function createResponseMapper ({ responseMapping }) {
  if (responseMapping) {
    return (typeof responseMapping === 'string')
      ? mapTransform([`data.${responseMapping}`, set('data')])
      : mapTransform(['data', normalizeMapping(responseMapping)])
  }
  return ({ data }) => ({ data })
}

module.exports = createResponseMapper

const { mapTransform } = require('map-transform')

function createResponseMapper ({ responsePath }) {
  return mapTransform((responsePath) ? `data.${responsePath}` : 'data')
}

module.exports = createResponseMapper

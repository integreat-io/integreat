const mapTransform = require('map-transform')

function createResponseMapper ({responsePath}) {
  return mapTransform({
    path: (responsePath) ? `data.${responsePath}` : 'data'
  })
}

module.exports = createResponseMapper

const mapTransform = require('map-transform')

function createRequestMapper ({requestPath, requestMapping}) {
  const mapping = {
    pathTo: requestPath
  }

  if (requestMapping) {
    mapping.fields = requestMapping
  } else {
    mapping.path = 'data'
  }

  return mapTransform(mapping)
}

module.exports = createRequestMapper

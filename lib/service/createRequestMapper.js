const mapTransform = require('map-transform')

function createRequestMapper ({requestPath, requestMapping}) {
  const def = {
    pathTo: requestPath
  }

  if (requestMapping) {
    def.mapping = requestMapping
  } else {
    def.path = 'data'
  }

  return mapTransform(def)
}

module.exports = createRequestMapper

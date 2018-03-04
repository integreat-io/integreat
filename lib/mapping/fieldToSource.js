const mapWithMappers = require('../utils/mapWithMappers')
const {set: setPath} = require('../utils/path')
const getField = require('../utils/getField')

function toSource (data, target, {key, path, formatPipeline}) {
  if (!data) {
    return target
  }

  const value = getField(data, key)

  if (value === undefined) {
    return target
  }

  const mappedValue = mapWithMappers(value, formatPipeline, /* reverse */ true, value)
  return setPath(target, path, mappedValue)
}

module.exports = toSource

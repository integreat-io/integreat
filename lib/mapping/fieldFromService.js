const mapWithMappers = require('../utils/mapWithMappers')
const { get: getPath } = require('../utils/path')

const setFieldValue = (target, key, value, isRelationship, isRootKey) => {
  if (isRootKey) {
    return { ...target, [key]: value }
  }

  const prop = (isRelationship) ? 'relationships' : 'attributes'
  target[prop] = { ...target[prop], [key]: value }
  return target
}

function fromService (data, target, params, { key, path, param, formatPipeline, isRelationship, isRootKey }) {
  if (key === 'type') {
    return target
  }
  const value = (param) ? params[param] : getPath(data, path)
  if (value === undefined) {
    return target
  }

  const mappedValue = mapWithMappers(value, formatPipeline, /* reverse */ false, value)
  return setFieldValue(target, key, mappedValue, isRelationship, isRootKey)
}

module.exports = fromService

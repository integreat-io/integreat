const mapWithMappers = require('../utils/mapWithMappers')
const filterWithFilters = require('../utils/filterWithFilters')
const {get: getPath, compare: comparePath} = require('../utils/path')

function fromSource (data, params, {
  useDefaults,
  type,
  path,
  qualifier,
  mappings,
  transformPipeline,
  filterFromPipeline,
  datatype
}) {
  if (!data) {
    return []
  }
  const items = [].concat(getPath(data, path) || [])

  return items
    .map((data) => {
      if ((mappings.length === 0 && data.type !== type) || !comparePath(data, qualifier)) {
        return undefined
      }

      const item = (mappings.length > 0)
        ? mappings.reduce((target, field) => field.fromSource(data, target, params), {type})
        : data

      const mapped = mapWithMappers(item, transformPipeline, /* reverse */ false, data)
      return datatype.cast(mapped, {useDefaults})
    })
    .filter((item) => item !== undefined && filterWithFilters(item, filterFromPipeline))
}

module.exports = fromSource

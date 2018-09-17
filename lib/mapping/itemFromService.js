const mapWithMappers = require('../utils/mapWithMappers')
const filterWithFilters = require('../utils/filterWithFilters')
const { get: getPath, compare: comparePath } = require('../utils/path')

function fromService (data, params, {
  useDefaults,
  type,
  path,
  qualifier,
  mappings,
  transformPipeline,
  filterFromPipeline,
  schema
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
        ? mappings.reduce((target, field) => field.fromService(data, target, params), { type })
        : data

      const mapped = mapWithMappers(item, transformPipeline, /* reverse */ false, data)
      return schema.cast(mapped, { useDefaults })
    })
    .filter((item) => item !== undefined && filterWithFilters(item, filterFromPipeline))
}

module.exports = fromService

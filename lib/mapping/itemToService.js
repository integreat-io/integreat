const mapWithMappers = require('../utils/mapWithMappers')
const filterWithFilters = require('../utils/filterWithFilters')
const {set: setPath} = require('../utils/path')

function toService (data, target, {path, mappings, transformPipeline, filterToPipeline}) {
  const items = [].concat(data)
    .filter((item) => filterWithFilters(item, filterToPipeline))
    .map((item) => (mappings.length > 0)
      ? mappings.reduce((target, field) => field.toService(item, target), {})
      : item)
    .map((item) =>
      mapWithMappers(item, transformPipeline, /* reverse */ true, data))

  if (items.length === 0) {
    return null
  }

  return setPath(target, path, (Array.isArray(data) ? items : items[0]))
}

module.exports = toService

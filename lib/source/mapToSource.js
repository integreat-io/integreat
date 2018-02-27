function mapToSource (data, mappings) {
  // Return if no data
  if (!data) {
    return undefined
  }

  // Function to map data for a single type
  const mapData = (data, type, target) => {
    const mapping = mappings[type]
    return (mapping) ? mapping.toSource(data, target) : target
  }

  // Map object if not an array
  if (!Array.isArray(data)) {
    return mapData(data, data.type)
  }

  // Split array into arrays grouped by type
  const typeArrays = data.reduce((types, item) => {
    const typeArray = types[item.type] || []
    return {...types, [item.type]: [...typeArray, item]}
  }, {})

  // Map for each type
  return Object.keys(typeArrays).reduce((target, type) =>
    mapData(typeArrays[type], type, target),
    undefined)
}

module.exports = mapToSource

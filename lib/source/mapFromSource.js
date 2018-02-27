/**
 * Map the data going _to_ the source. Everything is handled by the mappings,
 * but this method make sure that the right types are mapped.
 *
 * @param {Object} data - The data to map
 * @param {Object} mappings - The mappings to map with
 * @param {Object} options - params and useDefaults
 * @returns {Object[]} Array of mapped items
 */
function mapFromSource (data, mappings, {params, useDefaults}) {
  const type = params.type || Object.keys(mappings)
  if (!type || !data) {
    return []
  }

  return [].concat(type)
    .map((type) => (mappings[type])
      ? mappings[type].fromSource(data, params, {useDefaults})
      : [])
    .reduce((sup, sub) => [...sup, ...sub])
}

module.exports = mapFromSource

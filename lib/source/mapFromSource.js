function mapFromSource (data, mappings, {type, params, useDefaults}) {
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

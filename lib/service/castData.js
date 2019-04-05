const castData = ({ schemas }) => ({ request }) => {
  const { onlyMappedValues = true } = request.params
  const castOne = (item) => (item && schemas[item.type]) ? schemas[item.type].cast(item, { onlyMappedValues }) : undefined
  const data = (Array.isArray(request.data))
    ? request.data.map(castOne).filter((item) => !!item)
    : request.data && castOne(request.data)
  return { ...request, data }
}

module.exports = castData

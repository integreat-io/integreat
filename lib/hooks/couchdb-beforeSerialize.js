const prepareItem = (revArray) => (item, index) => {
  if (revArray && revArray.length > index && revArray[index]) {
    item._rev = revArray[index]
  }

  item._id = item.id
  delete item.id
}

async function beforeSerialize (request, {source}) {
  const {data} = request
  const ids = [].concat(data).map((item) => item.id)
  const revResponse = await source.retrieveNormalized({endpoint: 'getRevs', params: {ids}})

  if (Array.isArray(data)) {
    data.forEach(prepareItem(revResponse.data))
  } else {
    prepareItem(revResponse.data)(data, 0)
  }
}

module.exports = beforeSerialize

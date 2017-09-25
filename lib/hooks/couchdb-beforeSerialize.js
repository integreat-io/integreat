const prepareItem = (revArray) => (item, index) => {
  if (revArray && revArray.length > index && revArray[index] && revArray[index].value) {
    item._rev = revArray[index].value.rev

    if (item.type === 'meta' && revArray[index].doc && revArray[index].doc.attributes) {
      const oldAttrs = revArray[index].doc.attributes
      Object.keys(oldAttrs).forEach((key) => {
        if (!item.attributes.hasOwnProperty(key)) {
          item.attributes[key] = oldAttrs[key]
        }
      })
    }
  }

  item._id = item.id
  delete item.id
}

async function beforeSerialize (request, {source}) {
  const {data} = request
  const ids = [].concat(data).map((item) => item.id)
  const includeDocs = [].concat(data).some((item) => item.type === 'meta')
  const revResponse = await source.retrieveNormalized({endpoint: 'getRevs', params: {ids, includeDocs}})

  if (Array.isArray(data)) {
    data.forEach(prepareItem(revResponse.data))
  } else {
    prepareItem(revResponse.data)(data, 0)
  }
}

module.exports = beforeSerialize

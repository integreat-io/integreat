const gatherResources = (resources, dir) => (...ids) => {
  if (ids.length === 0) {
    ids = resources
  }

  const requireResource = (id) => require(`${dir}/${id}`)

  return ids.reduce(
    (obj, id) => (resources.includes(id)) ? Object.assign(obj, {[id]: requireResource(id)}) : obj,
    {}
  )
}

module.exports = gatherResources

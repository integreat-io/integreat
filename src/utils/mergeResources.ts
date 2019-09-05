import R = require('ramda')

const mergeResources = (...resources) => {
  return resources.reduce(
    (resources, external) => R.mergeDeepRight(resources, external),
    {}
  )
}

export default mergeResources

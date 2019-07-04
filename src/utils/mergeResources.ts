const { mergeDeepRight } = require('ramda')

const mergeResources = (...resources) => {
  return resources.reduce((resources, external) => mergeDeepRight(resources, external), {})
}

module.exports = mergeResources

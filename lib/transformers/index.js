const gatherResources = require('../utils/gatherResources')

const transformers = [
  'removeTypePrefixOnId'
]

module.exports = gatherResources(transformers, __dirname)

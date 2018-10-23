const gatherResources = require('../utils/gatherResources')

const transformers = [
  'not',
  'hash',
  'removeTypePrefixOnId'
]

module.exports = gatherResources(transformers, __dirname)

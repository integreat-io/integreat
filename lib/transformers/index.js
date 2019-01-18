const gatherResources = require('../utils/gatherResources')

const transformers = [
  'not',
  'hash',
  'lowercase',
  'removeTypePrefixOnId',
  'uppercase'
]

module.exports = gatherResources(transformers, __dirname)

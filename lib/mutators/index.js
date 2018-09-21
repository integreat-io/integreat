const gatherResources = require('../utils/gatherResources')

const mutators = [
  'removeTypePrefixOnId'
]

module.exports = gatherResources(mutators, __dirname)

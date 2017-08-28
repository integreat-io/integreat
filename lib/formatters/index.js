const gatherResources = require('../utils/gatherResources')

const formatters = [
  'not'
]

module.exports = gatherResources(formatters, __dirname)

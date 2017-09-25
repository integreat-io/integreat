const gatherResources = require('../utils/gatherResources')

const adapters = [
  'json'
]

module.exports = gatherResources(adapters, __dirname)

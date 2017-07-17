const gatherResources = require('../utils/gatherResources')

const adapters = [
  'json',
  'couchdb'
]

module.exports = gatherResources(adapters, __dirname)

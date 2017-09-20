const gatherResources = require('../utils/gatherResources')

const hooks = [
  'couchdb-afterNormalize',
  'couchdb-beforeSerialize'
]

module.exports = gatherResources(hooks, __dirname)

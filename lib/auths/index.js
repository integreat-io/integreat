const gatherResources = require('../utils/gatherResources')

const auth = [
  'options',
  'token'
]

module.exports = gatherResources(auth, __dirname)

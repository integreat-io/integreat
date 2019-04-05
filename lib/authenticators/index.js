const gatherResources = require('../utils/gatherResources')

const authenticators = [
  'options',
  'token',
  'oauth2'
]

module.exports = gatherResources(authenticators, __dirname)

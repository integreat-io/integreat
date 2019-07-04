import gatherResources from '../utils/gatherResources'

const authenticators = ['options', 'token', 'oauth2']

export default gatherResources(authenticators, __dirname)

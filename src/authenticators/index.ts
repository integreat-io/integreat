import gatherResources from '../utils/gatherResources'
import { Authenticator } from '../service/types'

const authenticators = ['options', 'token', 'oauth2']

export default gatherResources<Authenticator>(authenticators, __dirname)

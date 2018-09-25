const { compose } = require('ramda')
const castData = require('./castData')
const authorizeRequest = require('./authorizeRequest')
const mapFromService = require('./mapFromService')
const mapToService = require('./mapToService')
const sendRequest = require('./sendRequest')
const authorizeResponse = require('./authorizeResponse')

const composeSend = (...fns) => (options) => {
  const fnsWithOptions = fns.map((fn) => fn(options))
  return compose(...fnsWithOptions)
}

const awaitAndAssign = (prop, fn) => (options) => {
  const fnWithOptions = fn(options)
  return async (argsPromise) => {
    const args = await argsPromise
    const result = await fnWithOptions(args)
    return {
      ...args,
      [prop]: result
    }
  }
}

const extractRequestData = () => (args) => args.request.data

const respondToUnknownMethod = () => (args) => (args.request && args.request.method !== 'UNKNOWN')
  ? args
  : ({ ...args, response: { status: 'noaction' } })

module.exports = composeSend(
  awaitAndAssign('response', authorizeResponse),
  awaitAndAssign('response', mapFromService),
  awaitAndAssign('response', sendRequest),
  awaitAndAssign('request', mapToService),
  awaitAndAssign('authorizedRequestData', extractRequestData),
  awaitAndAssign('request', authorizeRequest),
  awaitAndAssign('request', castData),
  respondToUnknownMethod
)

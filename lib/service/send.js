const { compose } = require('ramda')
const castData = require('./castData')
const authorizeRequest = require('./authorizeRequest')
const mapFromService = require('./mapFromService')
const mapToService = require('./mapToService')
const sendRequest = require('./sendRequest')
const authorizeResponse = require('./authorizeResponse')
const authenticate = require('./authenticate')
const connect = require('./connect')

const composeWithOptions = (...fns) => (options) => {
  const fnsWithOptions = fns.map((fn) => fn(options))
  return compose(...fnsWithOptions)
}

const emitRequestAndResponse = (eventName) => ({ emit }) => async (argsPromise) => {
  const args = await argsPromise
  if (typeof emit === 'function') {
    emit(eventName, args.request, args.response || null)
  }
  return args
}

const awaitAndAssign = (prop, fn) => (options) => {
  const fnWithOptions = fn(options)
  return async (argsPromise) => {
    const args = await argsPromise
    const result = await fnWithOptions(args)
    return (prop)
      ? { ...args, [prop]: result }
      : { ...args, ...result }
  }
}

const extractRequestData = () => (args) => args.request.data

const respondToUnknownMethod = () => (args) => (args.request && args.request.method !== 'UNKNOWN')
  ? args
  : ({ ...args, response: { status: 'noaction' } })

module.exports = composeWithOptions(
  awaitAndAssign('response', authorizeResponse),
  emitRequestAndResponse('mappedFromService'),
  awaitAndAssign('response', mapFromService),
  emitRequestAndResponse('mapFromService'),
  awaitAndAssign('response', sendRequest),
  awaitAndAssign(null, connect),
  awaitAndAssign(null, authenticate),
  emitRequestAndResponse('mappedToService'),
  awaitAndAssign('request', mapToService),
  emitRequestAndResponse('mapToService'),
  awaitAndAssign('authorizedRequestData', extractRequestData),
  awaitAndAssign(null, authorizeRequest),
  awaitAndAssign('request', castData),
  respondToUnknownMethod
)

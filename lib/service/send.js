const { compose } = require('ramda')
const castData = require('./castData')
const authorizeRequest = require('./authorizeRequest')
const mapFromService = require('./mapFromService')
const mapToService = require('./mapToService')
const normalizeResponse = require('./normalizeResponse')
const sendRequest = require('./sendRequest')
const serializeRequest = require('./serializeRequest')
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

const knownActions = ['GET', 'SET', 'DELETE', 'REQUEST']

const respondToUnknownAction = () => (args) => (args.request && knownActions.includes(args.request.action))
  ? args
  : ({ ...args, response: { status: 'noaction' } })

const afterService = composeWithOptions(
  awaitAndAssign('response', authorizeResponse),
  emitRequestAndResponse('mappedFromService'),
  awaitAndAssign('response', mapFromService),
  emitRequestAndResponse('mapFromService')
)

const sendToService = composeWithOptions(
  awaitAndAssign('response', normalizeResponse),
  awaitAndAssign('response', sendRequest),
  awaitAndAssign(null, connect),
  awaitAndAssign(null, authenticate)
)

const beforeService = composeWithOptions(
  awaitAndAssign(null, serializeRequest),
  emitRequestAndResponse('mappedToService'),
  awaitAndAssign('request', mapToService),
  emitRequestAndResponse('mapToService'),
  awaitAndAssign('authorizedRequestData', extractRequestData),
  awaitAndAssign(null, authorizeRequest),
  awaitAndAssign('request', castData)
)

const send = composeWithOptions(
  afterService,
  sendToService,
  beforeService,
  respondToUnknownAction
)

module.exports = {
  send,
  beforeService,
  sendToService,
  afterService,
  respondToUnknownAction
}

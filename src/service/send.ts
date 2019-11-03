import R = require('ramda')
import authorizeRequest from './authorizeRequest'
import mapFromService from './mapFromService'
import mapToService from './mapToService'
import normalizeResponse from './normalizeResponse'
import sendRequest from './sendRequest'
import serializeRequest from './serializeRequest'
import authorizeResponse from './authorizeResponse'
import authenticate from './authenticate'
import connect from './connect'

const { compose } = R

const composeWithOptions = (...fns) => options => {
  const fnsWithOptions = fns.map(fn => fn(options))
  return compose(...fnsWithOptions)
}

const emitRequestAndResponse = eventName => ({ emit }) => async argsPromise => {
  const args = await argsPromise
  if (typeof emit === 'function') {
    emit(eventName, args.request, args.response || null)
  }
  return args
}

const awaitAndAssign = (prop, fn) => options => {
  const fnWithOptions = fn(options)
  return async argsPromise => {
    const args = await argsPromise
    const result = await fnWithOptions(args)
    return prop ? { ...args, [prop]: result } : { ...args, ...result }
  }
}

const extractRequestData = () => args => args.request.data

const knownActions = ['GET', 'SET', 'DELETE', 'REQUEST']

export const respondToUnknownAction = _options => args =>
  args.request && knownActions.includes(args.request.action)
    ? args
    : { ...args, response: { status: 'noaction' } }

export const afterService = composeWithOptions(
  awaitAndAssign('response', authorizeResponse),
  emitRequestAndResponse('mappedFromService'),
  awaitAndAssign('response', mapFromService),
  emitRequestAndResponse('mapFromService')
)

export const sendToService = composeWithOptions(
  awaitAndAssign('response', normalizeResponse),
  awaitAndAssign('response', sendRequest),
  awaitAndAssign(null, connect),
  awaitAndAssign(null, authenticate)
)

export const beforeService = composeWithOptions(
  awaitAndAssign(null, serializeRequest),
  emitRequestAndResponse('mappedToService'),
  awaitAndAssign('request', mapToService),
  emitRequestAndResponse('mapToService'),
  awaitAndAssign('authorizedRequestData', extractRequestData),
  awaitAndAssign(null, authorizeRequest)
)

export const send = composeWithOptions(
  afterService,
  sendToService,
  beforeService,
  respondToUnknownAction
)

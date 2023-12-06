import mapTransform from 'map-transform'
import { isObject } from './is.js'
import type { ValidateObject, MapOptions, Response } from '../types.js'

export type ResponsesAndBreak = [Response[], boolean]

export default function prepareValidator(
  conditions: ValidateObject[] | undefined,
  mapOptions: MapOptions,
  defaultErrorStatus = 'badrequest',
  breakByDefault = false,
): (action: unknown) => Promise<ResponsesAndBreak> {
  // Always return null when no validation
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return async () => [[], false]
  }

  // Prepare validators
  const validators = conditions.map(
    ({ condition, failResponse, break: breakOnFail = breakByDefault }) => ({
      validate: mapTransform(condition, mapOptions),
      breakOnFail,
      failResponse: isObject(failResponse)
        ? failResponse
        : {
            status: defaultErrorStatus,
            error:
              typeof failResponse === 'string'
                ? failResponse
                : 'Did not satisfy condition',
          },
    }),
  )

  return async function validate(action) {
    const failResponses = []
    let doBreak = false
    for (const { validate, failResponse, breakOnFail } of validators) {
      const result = await validate(action)
      if (!result) {
        failResponses.push(failResponse)
        if (breakOnFail) {
          doBreak = true
        }
      }
    }
    return [failResponses, doBreak]
  }
}

import httpTransporter from 'integreat-transporter-http'
import jsonAdapter from 'integreat-adapter-json'
import transformers from '../../../transformers/index.js'
import { Resources } from '../../../create.js'
import { TypedData, Action } from '../../../types.js'

const isoDate = () => () => (date: unknown) =>
  date instanceof Date ? date.toISOString() : undefined

// Lots of typing hoops. Sorry
const shouldHaveAuthor =
  () =>
  () =>
  (action: unknown): unknown => {
    return ((action as Action).payload?.data as TypedData).author
      ? action
      : {
          ...(action as Action),
          response: {
            ...(action as Action).response,
            status: 'badrequest',
            error: 'Error from validator',
            data: undefined,
          },
        }
  }

const resources: Resources = {
  transporters: { http: httpTransporter },
  adapters: { json: jsonAdapter },
  transformers: { ...transformers, isoDate, shouldHaveAuthor },
}

export default resources

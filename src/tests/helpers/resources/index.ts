import httpTransporter from 'integreat-transporter-http'
import jsonAdapter from 'integreat-adapter-json'
import jsonTransformer from 'integreat-adapter-json/transformer.js'
import uriAdapter from 'integreat-adapter-uri'
import uriTransformer from 'integreat-adapter-uri/transformer.js'
import { Resources, TypedData, Action } from '../../../types.js'

const isoDate = () => () => (date: unknown) =>
  date instanceof Date ? date.toISOString() : undefined

// Lots of typing hoops. Sorry
const shouldHaveAuthor =
  () =>
    () =>
      (action: unknown): unknown => {
        return ((action as Action).payload?.data as TypedData).author
      }

const resources: Resources = {
  transporters: { http: httpTransporter },
  adapters: { json: jsonAdapter, uri: uriAdapter },
  transformers: {
    isoDate,
    shouldHaveAuthor,
    json: jsonTransformer,
    uri: uriTransformer,
  },
}

export default resources

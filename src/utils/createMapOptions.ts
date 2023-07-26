import modifyOperationObject from './modifyOperationObject.js'
import type {
  TransformDefinition,
  Transformer,
  AsyncTransformer,
  Dictionaries,
} from 'map-transform/types.js'
import type Schema from '../schema/Schema.js'
import type { MapOptions } from '../service/types.js'

const transformersFromSchemas = (
  schemas: Record<string, Schema>
): Record<string, Transformer> =>
  Object.fromEntries(
    Object.entries(schemas).map(([type, schema]) => [
      Symbol.for(`cast_${type}`),
      () =>
        () =>
        (data, { rev = false }) =>
          schema.castFn(data, rev),
    ])
  )

export default function createMapOptions(
  schemas: Record<string, Schema>,
  mutations?: Record<string, TransformDefinition>,
  transformers?: Record<string, Transformer | AsyncTransformer>,
  dictionaries?: Dictionaries
): MapOptions {
  return {
    pipelines: mutations,
    transformers: {
      ...transformers,
      ...transformersFromSchemas(schemas),
    },
    dictionaries,
    fwdAlias: 'from',
    revAlias: 'to',
    nonvalues: [undefined, null, ''],
    modifyOperationObject,
  }
}

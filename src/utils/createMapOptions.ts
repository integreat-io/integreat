import modifyOperationObject from './modifyOperationObject.js'
import type { TransformDefinition } from 'map-transform/typesNext.js'
import type {
  Transformer,
  AsyncTransformer,
  Dictionaries,
} from 'map-transform/types.js'
import type Schema from '../schema/Schema.js'
import type { MapOptions } from '../types.js'

const transformersFromSchemas = (
  schemas: Map<string, Schema>,
): Record<string, Transformer> =>
  Object.fromEntries(
    [...schemas.values()].map((schema) => [
      Symbol.for(`cast_${schema.id}`),
      () =>
        () =>
        (data, { rev = false }) =>
          schema.castFn(data, rev),
    ]),
  )

export default function createMapOptions(
  schemas: Map<string, Schema>,
  mutations?: Record<string, TransformDefinition>,
  transformers?: Record<string, Transformer | AsyncTransformer>,
  dictionaries?: Dictionaries,
  nonvalues: unknown[] = [undefined, null, ''],
): MapOptions {
  // MapTransform caches prepared pipelines by the identity of the options
  // object, so this object should be created once and passed as is to every
  // call. A copy or a rebuilt object would prepare every pipeline again.
  return {
    pipelines: { ...mutations }, // Copy, to not hand the given object over to MapTransform
    transformers: {
      ...transformers,
      ...transformersFromSchemas(schemas),
    },
    dictionaries,
    fwdAlias: 'from',
    revAlias: 'to',
    nonvalues,
    modifyOperationObject,
  }
}

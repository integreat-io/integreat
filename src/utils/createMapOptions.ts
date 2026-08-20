import { prepareOptions } from 'map-transform'
import modifyOperationObject from './modifyOperationObject.js'
import type {
  TransformDefinition,
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
  // We let MapTransform prepare the options, so that every mutation created
  // with these options share the same prepared pipelines. Without this, each
  // mutation would prepare its own copy of every pipeline it applies.
  return prepareOptions({
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
  })
}

import { transform } from 'map-transform'
import type {
  TransformDefinition,
  Transformer,
  Dictionaries,
} from 'map-transform/types.js'
import type Schema from '../schema/Schema.js'
import type { MapOptions } from '../service/types.js'

const pipelinesFromSchemas = (
  schemas: Record<string, Schema>
): Record<string, TransformDefinition> =>
  Object.fromEntries(
    Object.entries(schemas).map(([id, def]) => [
      `cast_${id}`,
      transform(
        () =>
          (data, { rev = false }) =>
            def.castFn(data, rev)
      ),
    ])
  )

export default function createMapOptions(
  schemas: Record<string, Schema>,
  mutations?: Record<string, TransformDefinition>,
  transformers?: Record<string, Transformer>,
  dictionaries?: Dictionaries
): MapOptions {
  return {
    pipelines: {
      ...mutations,
      ...pipelinesFromSchemas(schemas),
    },
    transformers,
    dictionaries,
    fwdAlias: 'from',
    revAlias: 'to',
    nonvalues: [undefined, null, ''],
  }
}

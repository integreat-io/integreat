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
  Object.entries(schemas).reduce(
    (pipelines, [id, def]) => ({ ...pipelines, [`cast_${id}`]: def.mutation }),
    {}
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

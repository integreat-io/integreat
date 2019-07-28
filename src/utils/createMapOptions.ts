import { MapDefinition, CustomFunction } from 'map-transform'
import { MappingDef } from '../types'

interface MapDefinitions {
  [id: string]: MapDefinition
}

export interface TransformFunctions {
  [id: string]: CustomFunction
}

const pipelinesFromMappings = (mappings: MappingDef[]): MapDefinitions =>
  mappings.reduce(
    (pipelines, def) => ({
      ...pipelines,
      [def.id]: def.pipeline
    }),
    {}
  )

const pipelinesFromSchemas = (schemas: MapDefinitions): MapDefinitions =>
  Object.entries(schemas).reduce(
    (pipelines, [id, def]) => ({ ...pipelines, [`cast_${id}`]: def }),
    {}
  )

export default function createMapOptions(
  mappings: MappingDef[],
  schemas: MapDefinitions,
  functions: TransformFunctions
) {
  return {
    pipelines: {
      ...pipelinesFromMappings(mappings),
      ...pipelinesFromSchemas(schemas)
    },
    functions
  }
}

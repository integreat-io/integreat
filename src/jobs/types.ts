import { Action, Condition, ValidateObject } from '../types.js'
import type {
  TransformDefinition,
  MutationObject,
} from 'map-transform/typesNext.js'

// MapTransform does not export the `Pipeline` type from `typesNext.js`, so we
// extract it from `TransformDefinition`.
export type Pipeline = Extract<TransformDefinition, unknown[]>

export interface JobBase {
  conditions?: Record<string, Condition | undefined>
  preconditions?: ValidateObject[]
  premutation?: MutationObject | Pipeline
  mutation?: MutationObject | Pipeline
  iterate?: TransformDefinition
  iteratePath?: string
  iterateConcurrency?: number
  postmutation?: MutationObject | Pipeline
  postconditions?: ValidateObject[]
  responseMutation?: MutationObject | Pipeline
}

export interface JobStepDef extends JobBase {
  id: string
  action: Action
}

export interface JobDef extends JobBase {
  id?: string
  action?: Action
  flow?: (JobStepDef | JobStepDef[])[]
  cron?: string
  tz?: string
}

export interface JobDefWithFlow extends JobDef {
  flow: NonNullable<JobDef['flow']>
}

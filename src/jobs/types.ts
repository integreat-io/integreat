import { Action, Condition, ValidateObject } from '../types.js'
import type {
  TransformDefinition,
  MutationObject,
  Pipeline,
} from 'map-transform/typesNext.js'

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

import type {
  CtgVariability,
  CtgPresence,
  CtgAtMfRatio,
  CtgDecelType,
  CtgSoundStimulus,
  CtgConclusion,
} from "./scoring";

export interface CtgRecord {
  id: string;
  patientId: string;
  recordedAt: string; // ISO
  baseline?: number | null;
  variability?: CtgVariability | null;
  accelerations?: CtgPresence | null;
  atMfRatio?: CtgAtMfRatio | null;
  movements?: CtgPresence | null;
  decelerations?: CtgPresence | null;
  decelerationType?: CtgDecelType | null;
  decelerationCount?: string | null;
  contractions?: CtgPresence | null;
  soundStimulus?: CtgSoundStimulus | null;
  stimulusCount?: string | null;
  score: number;
  conclusion: CtgConclusion | string;
  notes?: string | null;
  imagePath?: string | null;
}

export interface NewCtgInput {
  patientId: string;
  recordedAt?: string;
  baseline?: number | null;
  variability?: CtgVariability | null;
  accelerations?: CtgPresence | null;
  atMfRatio?: CtgAtMfRatio | null;
  movements?: CtgPresence | null;
  decelerations?: CtgPresence | null;
  decelerationType?: CtgDecelType | null;
  decelerationCount?: string | null;
  contractions?: CtgPresence | null;
  soundStimulus?: CtgSoundStimulus | null;
  stimulusCount?: string | null;
  score: number;
  conclusion: CtgConclusion | string;
  notes?: string | null;
  imagePath?: string | null;
}

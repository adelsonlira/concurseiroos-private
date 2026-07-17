/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export * from "./competitionRoadmapAdapter";

export {
  buildCompetitionEvidenceCoverage as buildDataprevEvidenceCoverage,
  buildCompetitionStrategicRoadmap as buildDataprevStrategicRoadmap
} from "./competitionRoadmapAdapter";

export type {
  CompetitionEvidenceSnapshot as DataprevEvidenceSnapshot,
  CompetitionRoadmapSnapshot as DataprevRoadmapSnapshot,
  CompetitionStrategicRoadmap as DataprevStrategicRoadmap
} from "./competitionRoadmapAdapter";

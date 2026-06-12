import type { Check } from "../types";
import { technicalChecks } from "./technical";
import { indexabilityChecks } from "./indexability";
import { structuredDataChecks } from "./structured-data";
import { contentChecks } from "./content";
import { adsChecks } from "./ads";

export const allChecks: Check[] = [
  ...technicalChecks,
  ...indexabilityChecks,
  ...structuredDataChecks,
  ...contentChecks,
  ...adsChecks,
];

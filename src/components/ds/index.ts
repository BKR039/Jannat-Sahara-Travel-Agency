/**
 * Design-system primitives.
 *
 * These own the visual rules the audit found scattered across feature code:
 * card form, control arrangement, table rhythm, and the state vocabulary.
 * Feature code composes them and does not restyle them.
 *
 * Section rhythm deliberately lives in `@/components/common/Section`, which
 * already owned it and was already adopted — a second Section here would have
 * been a parallel implementation of a working system.
 */
export { Surface } from "./Surface";
export { Field, controlClass, CONTROL_BASE } from "./Field";
export { DataTable, type Column } from "./DataTable";
export { StatusChip, type ChipVocab } from "./StatusChip";

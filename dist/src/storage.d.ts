/**
 * Small persistence boundary used by server-side domain services.
 *
 * The alpha server currently supplies a local JSON adapter, while the game
 * services only depend on this contract. A future database adapter can live
 * outside the rules/domain layer without changing RoomService, matchmaking,
 * or player-account logic.
 */
export interface SnapshotPersistence<TSnapshot> {
    storageLabel: string;
    load(): TSnapshot | null;
    save(snapshot: TSnapshot): void;
}

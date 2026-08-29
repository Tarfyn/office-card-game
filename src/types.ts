export type PlayerId = "P1" | "P2";

export type Department =
  | "CUSTOMER_SERVICE"
  | "IT"
  | "OFFICE"
  | "MARKETING"
  | "PRODUCTION"
  | "NEUTRAL";

export type CardType = "EMPLOYEE" | "ACTION" | "INCIDENT" | "SYSTEM" | "WORKPLACE";
export type Rank = "STAFF" | "LEAD" | "EXECUTIVE";
export type Phase = "MULLIGAN" | "START" | "DRAW" | "MAIN" | "BATTLE" | "END";
export type Zone = "DECK" | "HAND" | "EMPLOYEE_FIELD" | "SUPPORT_FIELD" | "ARCHIVE" | "PENDING";
export type GameStatus = "SETUP" | "ACTIVE" | "ENDED";
export type RelativePlayer = "SELF" | "OPPONENT";
export type TargetController = RelativePlayer | "ANY";
export type Duration = "END_OF_TURN" | "UNTIL_START_OF_NEXT_OWN_TURN";
export type Keyword = "BREAKTHROUGH";
export type PlayMethod = "NORMAL" | "DEPLOY" | "PROMOTION" | "RETURN_FROM_ARCHIVE" | "SPECIAL";
export type ScheduleTiming = "OWN_END_PHASE" | "START_OF_NEXT_OWN_TURN" | "END_OF_NEXT_OWN_TURN" | "START_OF_NEXT_CONTROLLER_MAIN_PHASE";

export type Trigger =
  | { event: "CARD_PLAYED"; controller: RelativePlayer; cardFilter?: CardFilter; playMethod?: PlayMethod }
  | { event: "REPUTATION_RESTORED"; player: RelativePlayer; causedByTag?: string; causeMustNotBeSource?: boolean }
  | { event: "ACTION_RESOLVED"; controller: RelativePlayer; cardFilter?: CardFilter }
  | { event: "ATTACK_DECLARED"; actor: RelativePlayer; targetController?: RelativePlayer; targetFilter?: CardFilter; targetMustNotBeSource?: boolean }
  | { event: "ACTION_ACTIVATED"; controller: RelativePlayer }
  | { event: "CARD_RETURNED_FROM_ARCHIVE"; controller: RelativePlayer; cardFilter?: CardFilter; causedByTag?: string }
  | { event: "REPUTATION_LOST"; player: RelativePlayer; causedByDepartment?: Department }
  | { event: "BATTLE_EMPLOYEE_DESTROYED"; attackerController?: RelativePlayer; attackerFilter?: CardFilter; destroyedController?: RelativePlayer; destroyedFilter?: CardFilter }
  | { event: "CARD_ARCHIVED"; controller: RelativePlayer; cardFilter?: CardFilter; sourceOnly?: boolean; causedByTag?: string; causedByController?: RelativePlayer }
  | { event: "ACTION_WOULD_BE_ARCHIVED"; controller: RelativePlayer; cardFilter?: CardFilter }
  | { event: "CARD_DELAYED"; controller: RelativePlayer }
  | { event: "BATTLE_DESTRUCTION_PENDING"; controller: RelativePlayer; cardFilter?: CardFilter }
  | {
      event: "CHAIN_ITEM_ACTIVATED";
      controller: RelativePlayer;
      targeted?: boolean;
      targetController?: RelativePlayer;
      targetFilter?: CardFilter;
      targetMustNotBeSource?: boolean;
    };

export interface CardFilter {
  cardType?: CardType;
  department?: Department;
  rank?: Rank;
  tag?: string;
  tagsAny?: string[];
  tagsAll?: string[];
  team?: string;
  anyOf?: CardFilter[];
  allOf?: CardFilter[];
  printedCapacityCost?: { min?: number; max?: number };
  enteredFieldThisTurn?: boolean;
  excludeDefinitionId?: string;
}

export interface TargetSelector extends CardFilter {
  id: string;
  controller: TargetController;
  zone: Zone | Zone[];
  min: number;
  max: number;
  excludeSource?: boolean;
  mustBePendingBattleDestruction?: boolean;
  sourceOnly?: boolean;
  subsetOf?: string;
  mustBeTriggeringChainTarget?: boolean;
  excludeEventAttacker?: boolean;
  excludeSourceDefinition?: boolean;
  excludeCurrentAttackTarget?: boolean;
  excludeTriggeringChainCurrentTargets?: boolean;
  mustBeLegalForTriggeringChainFirstTarget?: boolean;
}

export type Condition =
  | {
      type: "CONTROL_COUNT";
      controller: RelativePlayer;
      zone: "EMPLOYEE_FIELD" | "SUPPORT_FIELD";
      filter?: CardFilter;
      min: number;
    }
  | {
      type: "TURN_COUNTER_EQUALS";
      controller: RelativePlayer;
      counter: "ACTIONS_PLAYED_BY_DEPARTMENT";
      department: Department;
      value: number;
    }
  | { type: "CARDS_PLAYED_BY_TAG_EQUALS"; controller: RelativePlayer; tag: string; value: number }
  | { type: "CARDS_PLAYED_BY_TAG_AT_LEAST"; controller: RelativePlayer; tag: string; value: number }
  | { type: "ACTIONS_PLAYED_TOTAL_EQUALS"; controller: RelativePlayer; value: number }
  | { type: "ACTIVE_PLAYER_IS"; player: RelativePlayer }
  | { type: "TARGET_MATCHES_FILTER"; target: string; filter: CardFilter }
  | { type: "SOURCE_PRINTED_COST_AT_LEAST"; amount: number }
  | { type: "HAS_AVAILABLE_CAPACITY"; player: RelativePlayer; amount: number }
  | { type: "HAS_FREE_SLOT"; player: RelativePlayer; zone: "EMPLOYEE_FIELD" | "SUPPORT_FIELD" }
  | { type: "TARGET_IS_SAME_OBJECT_IN_ZONE"; target: string; zone: Zone }
  | { type: "TARGET_NOT_SAME_OBJECT_IN_ZONE"; target: string; zone: Zone }
  | { type: "TARGET_ATTACKS_USED_AT_LEAST"; target: string; amount: number }
  | { type: "EVENT_BATTLE_EXCESS_POWER_AT_LEAST"; amount: number }
  | { type: "EVENT_BREAKTHROUGH_NOT_APPLIED" }
  | { type: "CHAIN_ITEM_HAS_EFFECT"; effectType: "DESTROY_TARGET" }
  | { type: "TARGET_IS_TRIGGERING_CHAIN_TARGET"; target: string }
  | { type: "INCIDENT_ACTIVATED_DURING_OPPONENT_LAST_TURN" }
  | { type: "EMPLOYEE_DESTROYED_BY_OPPONENT_LAST_TURN" };

export interface ChoiceOption {
  id: string;
  availableIf?: Condition[];
  effects: Effect[];
}

export type Effect =
  | { type: "DRAW"; player: RelativePlayer; amount: number }
  | { type: "SHUFFLE_DECK"; player: RelativePlayer }
  | { type: "REVEAL_TARGET"; target: string; to: "BOTH" | "CONTROLLER" }
  | { type: "SEARCH_DECK"; player: RelativePlayer; filter?: CardFilter; min: number; max: number; destination: "HAND"; revealSelected?: boolean; shuffleAfter?: boolean }
  | { type: "LOOK_AT_TOP_SELECT"; player: RelativePlayer; amount: number; filter?: CardFilter; min: number; max: number; selectedDestination: "HAND" | "TOP" | "BOTTOM"; unselectedDestination: "TOP" | "BOTTOM"; revealSelected?: boolean; allowReorderUnselected?: boolean }
  | { type: "GAIN_CAPACITY"; player: RelativePlayer; amount: number }
  | { type: "PAY_CAPACITY"; player: RelativePlayer; amount: number }
  | { type: "LOSE_AVAILABLE_CAPACITY"; player: RelativePlayer; amount: number }
  | { type: "LOSE_REPUTATION"; player: RelativePlayer; amount: number | { fromEvent: "BATTLE_EXCESS_POWER" } }
  | { type: "RESTORE_REPUTATION"; player: RelativePlayer; amount: number }
  | { type: "MODIFY_POWER"; target: string; amount: number; duration: Duration }
  | { type: "MODIFY_MAX_ATTACKS"; target: string; amount: number; duration: Duration }
  | { type: "GRANT_KEYWORD"; target: string; keyword: Keyword; duration: Duration }
  | { type: "ADD_STATUS"; target: string; status: "ONBOARDING" }
  | { type: "REMOVE_STATUS"; target: string; status: "ONBOARDING" }
  | { type: "PREVENT_ATTACK"; target: string; duration: "END_OF_TURN" | "THROUGH_NEXT_CONTROLLER_BATTLE_PHASE" }
  | { type: "FOR_EACH_MATCHING"; selector: TargetSelector; effects: Effect[] }
  | { type: "RESET_TARGET_TEMPORARY"; target: string }
  | { type: "DESTROY_TARGET"; target: string; cause: "CARD_EFFECT" }
  | { type: "ADD_DESTRUCTION_SHIELD"; target: string; cause: "CARD_EFFECT"; duration: "END_OF_TURN" | "UNTIL_CHAIN_ITEM_RESOLVES" | "UNTIL_START_OF_NEXT_OWN_TURN"; onlyOpponentSource?: boolean }
  | { type: "ADD_DESTRUCTION_SHIELD_TO_TRIGGERING_TARGETS"; cause: "CARD_EFFECT"; duration: "UNTIL_CHAIN_ITEM_RESOLVES"; filter?: CardFilter }
  | { type: "MOVE_TARGET"; target: string; to: "ARCHIVE" | "HAND" | "EMPLOYEE_FIELD" | "DECK"; firstFreeSlot?: boolean; playMethod?: PlayMethod; shuffleAfter?: boolean }
  | { type: "PLAY_TARGET"; target: string; ignoreCapacityCost?: boolean; costAdjustment?: number; playMethod: PlayMethod; firstFreeSupportSlot?: boolean; firstFreeEmployeeSlot?: boolean }
  | { type: "NEGATE_CHAIN_ITEM"; target: "TRIGGERING_CHAIN_ITEM" }
  | { type: "REDIRECT_ATTACK_TARGET"; newTarget: string | "SOURCE" }
  | { type: "REDIRECT_CHAIN_TARGET"; target: "TRIGGERING_CHAIN_ITEM"; targetKey: string; newTarget: string | "SOURCE" }
  | { type: "DELAY_CHAIN_ITEM"; target: "TRIGGERING_CHAIN_ITEM"; until: "START_OF_NEXT_CONTROLLER_MAIN_PHASE" }
  | { type: "END_CURRENT_ATTACK" }
  | { type: "ARCHIVE_FROM_HAND_SELECT"; player: RelativePlayer; min: number; max: number }
  | { type: "RESTRICT_PLAY_TARGET"; target: string; duration: "END_OF_TURN" }
  | { type: "MODIFY_PROMOTION_VALUE"; target: string; amount: number; duration: "END_OF_TURN" }
  | { type: "ADD_NEXT_PROMOTION_REDUCTION"; player: RelativePlayer; department: Department; amount: number; minimumRequired: number; duration: "END_OF_TURN" }
  | { type: "ADD_DIRECT_DAMAGE_RIDER"; target: string; amount: number; duration: "END_OF_TURN" }
  | { type: "ARCHIVE_SOURCE" }
  | { type: "MOVE_TRIGGERING_CHAIN_SOURCE"; to: "HAND"; restrictPlayForTurn?: boolean }
  | { type: "REVEAL_RANDOM_HAND_CARD"; player: RelativePlayer; storeAs: string; to: "BOTH" | "CONTROLLER" }
  | { type: "REVEAL_FACE_DOWN_SUPPORT"; player: RelativePlayer; to: RelativePlayer; duration: "END_OF_TURN" }
  | { type: "PREVENT_ATTACK_EXCEPT"; targets: string; except: string; duration: "END_OF_TURN" }
  | { type: "SCHEDULE"; timing: ScheduleTiming; condition?: Condition; effects: Effect[] }
  | { type: "OFFER_CHOICE"; player: RelativePlayer | "TRIGGERING_PLAYER"; options: ChoiceOption[]; fallbackOption?: string }
  | { type: "IF"; condition: Condition; then: Effect[] };

export interface UsageLimit {
  scope: "SOURCE";
  count: number;
  period: "TURN";
  group?: string;
}

export type Ability =
  | {
      id: string;
      type: "ACTIVATED";
      timing: "OWN_MAIN_PHASE";
      conditions?: Condition[];
      targets?: TargetSelector[];
      usageLimit?: UsageLimit;
      effects: Effect[];
    }
  | {
      id: string;
      type: "TRIGGERED";
      trigger: Trigger;
      conditions?: Condition[];
      targets?: TargetSelector[];
      usageLimit?: UsageLimit;
      effects: Effect[];
    }
  | {
      id: string;
      type: "CONTINUOUS";
      conditions?: Condition[];
      appliesTo: TargetSelector;
      effects: Array<{ type: "MODIFY_POWER" | "MODIFY_COST" | "SET_ACTION_PLAY_LIMIT"; amount: number }>;
      phases?: Phase[];
      usageLimit?: UsageLimit;
    }
  | {
      id: string;
      type: "REPLACEMENT";
      replacement: "REPUTATION_LOSS";
      sourceController: RelativePlayer;
      reason: "CARD_EFFECT";
      amount: number;
      usageLimit?: UsageLimit;
    };

export interface PromotionDefinition {
  required: number;
  materials: CardFilter;
}

export type ImplementationStatus = "FULL" | "PARTIAL" | "TEXT_ONLY";
export type RarityTier = "T0" | "T1" | "T2" | "T3" | "T4";

export interface CardDefinition {
  id: string;
  version: number;
  name: string;
  rulesText?: string;
  flavorText?: string;
  artId?: string;
  implementationStatus?: ImplementationStatus;
  implementationNotes?: string;
  rarityTier?: RarityTier;
  scrapValue?: number;
  craftCost?: number;
  cardType: CardType;
  department: Department;
  rank?: Rank;
  teams?: string[];
  tags?: string[];
  cost?: { play?: number; set?: number };
  power?: number;
  keywords?: Keyword[];
  promotion?: PromotionDefinition;
  abilities?: Ability[];
}

export interface PowerModifier {
  id: string;
  amount: number;
  sourceInstanceId?: string;
  abilityId?: string;
  duration?: Duration;
  expiresAtTurnNumber?: number;
  expiresAtPlayerId?: PlayerId;
  expiresAtTurnsStarted?: number;
}

export interface PowerContribution {
  kind: "TEMPORARY" | "CONTINUOUS";
  amount: number;
  sourceInstanceId?: string;
  abilityId?: string;
  duration?: Duration;
}

export interface ClientPowerContribution {
  kind: "TEMPORARY" | "CONTINUOUS";
  amount: number;
  sourceId?: string;
  sourceDefinitionId?: string;
  abilityId?: string;
  duration?: Duration;
}

export interface KeywordModifier {
  id: string;
  keyword: Keyword;
  sourceInstanceId?: string;
  abilityId?: string;
  duration?: Duration;
  expiresAtTurnNumber: number;
}

export interface DestructionShieldModifier {
  id: string;
  cause: "CARD_EFFECT";
  sourceInstanceId?: string;
  abilityId?: string;
  duration?: "END_OF_TURN" | "UNTIL_CHAIN_ITEM_RESOLVES" | "UNTIL_START_OF_NEXT_OWN_TURN";
  expiresAtTurnNumber?: number;
  expiresAfterChainItemId?: string;
  expiresAtControllerTurnsStarted?: number;
  onlyOpponentSource?: boolean;
}

export interface DirectDamageRider {
  id: string;
  sourceInstanceId: string;
  amount: number;
  expiresAtTurnNumber: number;
}

export interface CardInstance {
  instanceId: string;
  definitionId: string;
  ownerId: PlayerId;
  controllerId: PlayerId;
  zone: Zone;
  objectVersion: number;
  faceUp: boolean;
  slot: number | null;
  onboarding: boolean;
  attacksUsed: number;
  maxAttacks: number;
  powerModifiers: PowerModifier[];
  keywordModifiers: KeywordModifier[];
  destructionShields: DestructionShieldModifier[];
  setTurnNumber: number | null;
  lastPlayMethod: PlayMethod | null;
  enteredFieldTurnNumber: number | null;
  cannotAttackUntilTurnNumber: number | null;
  cannotAttackThroughControllerTurnsStarted: number | null;
  attackRestrictionSourceInstanceId?: string;
  attackRestrictionAbilityId?: string;
  attackRestrictionDuration?: "END_OF_TURN" | "THROUGH_NEXT_CONTROLLER_BATTLE_PHASE";
  cannotPlayUntilTurnNumber: number | null;
  promotionValueModifiers: Array<{ id: string; amount: number; expiresAtTurnNumber: number }>;
  directDamageRiders: DirectDamageRider[];
}

export interface PromotionReduction {
  id: string;
  department: Department;
  amount: number;
  minimumRequired: number;
  expiresAtTurnNumber: number;
}

export interface TurnActivity {
  activePlayerId: PlayerId | null;
  incidentsActivatedBy: Partial<Record<PlayerId, number>>;
  employeesDestroyedByOpponent: Partial<Record<PlayerId, number>>;
}

export interface RevealPermission {
  viewerId: PlayerId;
  controllerId: PlayerId;
  expiresAtTurnNumber: number;
}

export interface TurnCounters {
  actionsPlayedTotal: number;
  actionsPlayedByDepartment: Partial<Record<Department, number>>;
  cardsPlayedByTag: Record<string, number>;
}

export interface PlayerState {
  id: PlayerId;
  reputation: number;
  maxCapacity: number;
  availableCapacity: number;
  turnsStarted: number;
  deck: string[];
  hand: string[];
  employeeField: Array<string | null>;
  supportField: Array<string | null>;
  archive: string[];
  mulliganDone: boolean;
  turnCounters: TurnCounters;
  promotionReductions: PromotionReduction[];
}

export type EventType =
  | "MATCH_CREATED"
  | "MULLIGAN_COMPLETED"
  | "TURN_STARTED"
  | "DRAW_SKIPPED"
  | "CARD_DRAWN"
  | "PHASE_CHANGED"
  | "CAPACITY_CHANGED"
  | "CARD_PLAYED"
  | "PROMOTION_COMPLETED"
  | "INCIDENT_SET"
  | "INCIDENT_ACTIVATED"
  | "CHAIN_ITEM_ADDED"
  | "CHAIN_ITEM_NEGATED"
  | "CHAIN_ITEM_DELAYED"
  | "CHAIN_RESOLVED"
  | "PRIORITY_PASSED"
  | "CHOICE_REQUIRED"
  | "CHOICE_RESOLVED"
  | "SCHEDULED_EFFECT_CREATED"
  | "SCHEDULED_EFFECT_RESOLVED"
  | "PENDING_EFFECT_RESOLVED"
  | "ATTACK_ENDED"
  | "CARD_MOVED"
  | "ACTION_RESOLVED"
  | "ABILITY_ACTIVATED"
  | "POWER_MODIFIED"
  | "KEYWORD_GRANTED"
  | "CARD_RESET"
  | "DESTRUCTION_ATTEMPTED"
  | "DESTRUCTION_PREVENTED"
  | "CARD_DESTROYED"
  | "COST_CALCULATED"
  | "ATTACKS_MODIFIED"
  | "ATTACK_DECLARED"
  | "EMPLOYEE_DESTROYED"
  | "BATTLE_DESTRUCTION_PENDING"
  | "BATTLE_RESOLVED"
  | "BREAKTHROUGH_DAMAGE"
  | "TRIGGER_QUEUED"
  | "TRIGGER_CHAIN_CREATED"
  | "ATTACK_TARGET_REDIRECTED"
  | "CHAIN_TARGET_REDIRECTED"
  | "REPUTATION_CHANGED"
  | "CARD_ARCHIVED"
  | "ACTION_ARCHIVE_PENDING"
  | "REPUTATION_LOSS_REDUCED"
  | "DIRECT_DAMAGE_RIDER"
  | "REVEAL_PERMISSION_GRANTED"
  | "DECK_SELECTION_REQUIRED"
  | "DECK_SELECTION_RESOLVED"
  | "TRIGGER_TARGET_SELECTION_REQUIRED"
  | "TRIGGER_TARGET_SELECTION_RESOLVED"
  | "HAND_SELECTION_REQUIRED"
  | "HAND_SELECTION_RESOLVED"
  | "CARD_PLAY_RESTRICTED"
  | "CARD_DELAYED"
  | "DECK_SHUFFLED"
  | "CARD_REVEALED"
  | "TOP_CARDS_VIEWED"
  | "GAME_ENDED";

export interface GameEvent {
  seq: number;
  type: EventType;
  playerId?: PlayerId;
  cardInstanceId?: string;
  data?: Record<string, unknown>;
}

export interface ChainItem {
  id: string;
  sourceInstanceId: string;
  sourceObjectVersion: number;
  controllerId: PlayerId;
  abilityId: string;
  effects: Effect[];
  targets: Record<string, string[]>;
  targetObjectVersions: Record<string, Record<string, number>>;
  targetSelectors: TargetSelector[];
  negated: boolean;
  delayed: boolean;
  triggeringChainItemId: string | null;
  archiveSourceAfterResolve: boolean;
  triggerEvent?: TriggerEventContext;
  effectsResolved: boolean;
  archiveWindowOffered: boolean;
  resolutionEventEmitted: boolean;
}

export interface PendingAttack {
  attackerId: string;
  targetId: string | null;
  originalTargetId: string | null;
  controllerId: PlayerId;
  cancelled: boolean;
}

export interface PendingBattleResolution {
  attackerId: string;
  targetId: string;
  controllerId: PlayerId;
  attackerPower: number;
  defenderPower: number;
  attackerObjectVersion: number;
  targetObjectVersion: number;
  destructionCandidateIds: string[];
  winnerId: string | null;
  excessPower: number;
}

export type ResponseWindow =
  | { event: "ATTACK_DECLARED"; actorId: PlayerId; triggeringChainItemId: null }
  | { event: "BATTLE_DESTRUCTION_PENDING"; actorId: PlayerId; triggeringChainItemId: null; destructionCandidateIds: string[] }
  | { event: "BATTLE_EMPLOYEE_DESTROYED"; actorId: PlayerId; triggeringChainItemId: null; destroyedIds: string[] }
  | { event: "ACTION_WOULD_BE_ARCHIVED"; actorId: PlayerId; triggeringChainItemId: string; actionId: string }
  | { event: "CHAIN_ITEM_ACTIVATED"; actorId: PlayerId; triggeringChainItemId: string };

export interface TriggerEventContext {
  event: "CARD_PLAYED" | "CARD_RETURNED_FROM_ARCHIVE" | "REPUTATION_LOST" | "REPUTATION_RESTORED" | "ACTION_RESOLVED" | "BATTLE_EMPLOYEE_DESTROYED" | "CARD_DELAYED" | "CARD_ARCHIVED";
  actorId?: PlayerId;
  playerId?: PlayerId;
  cardInstanceId?: string;
  causeSourceId?: string;
  causeDepartment?: Department;
  causeTags?: string[];
  attackerId?: string;
  defenderId?: string;
  attackerPower?: number;
  defenderPower?: number;
  battleExcessPower?: number;
  breakthroughApplied?: boolean;
  playMethod?: PlayMethod | null;
  archivedFromZone?: Zone;
  causedByControllerId?: PlayerId;
}

export interface PendingTrigger {
  id: string;
  sourceInstanceId: string;
  sourceObjectVersion: number;
  controllerId: PlayerId;
  abilityId: string;
  event: TriggerEventContext;
}

export interface CostModifierApplication {
  sourceInstanceId: string;
  abilityId: string;
  amount: number;
}

export interface CostCalculation {
  printedCost: number;
  finalCost: number;
  modifiers: CostModifierApplication[];
}

export interface ScheduledEffect {
  id: string;
  controllerId: PlayerId;
  sourceInstanceId: string;
  sourceObjectVersion: number;
  abilityId: string;
  duePlayerId: PlayerId;
  dueTurnsStarted: number;
  phase: "START" | "MAIN" | "END";
  targets: Record<string, string[]>;
  targetObjectVersions: Record<string, Record<string, number>>;
  condition?: Condition;
  effects: Effect[];
}

export interface PendingResolution {
  id: string;
  sourceInstanceId: string;
  sourceObjectVersion: number;
  controllerId: PlayerId;
  abilityId: string;
  dueTurnsStarted: number;
  phase: "MAIN";
  effects: Effect[];
  targets: Record<string, string[]>;
  targetObjectVersions: Record<string, Record<string, number>>;
}

export interface PendingChoice {
  id: string;
  playerId: PlayerId;
  chainItemId: string;
  sourceId: string;
  controllerId: PlayerId;
  abilityId: string;
  triggeringChainItemId: string | null;
  targets: Record<string, string[]>;
  targetObjectVersions: Record<string, Record<string, number>>;
  options: ChoiceOption[];
  fallbackOption?: string;
}


export interface PendingTriggerTargetSelection {
  id: string;
  playerId: PlayerId;
  sourceInstanceId: string;
  sourceObjectVersion: number;
  abilityId: string;
  event: TriggerEventContext;
  targetChoices: LegalTargetChoice[];
}

export interface PendingHandSelection {
  id: string;
  playerId: PlayerId;
  controllerId: PlayerId;
  sourceId: string;
  abilityId: string;
  resolvingChainItemId: string | null;
  triggeringChainItemId: string | null;
  candidateIds: string[];
  min: number;
  max: number;
  archiveSourceAfterResolve: boolean;
}

export interface PendingDeckSelection {
  id: string;
  playerId: PlayerId;
  controllerId: PlayerId;
  sourceId: string;
  abilityId: string;
  resolvingChainItemId: string | null;
  triggeringChainItemId: string | null;
  mode: "SEARCH" | "TOP";
  candidateIds: string[];
  visibleIds: string[];
  min: number;
  max: number;
  selectedDestination: "HAND" | "TOP" | "BOTTOM";
  unselectedDestination?: "TOP" | "BOTTOM";
  revealSelected: boolean;
  shuffleAfter: boolean;
  allowReorderUnselected: boolean;
  archiveSourceAfterResolve: boolean;
}


export interface GameState {
  matchId: string;
  stateVersion: number;
  seed: number;
  status: GameStatus;
  phase: Phase;
  activePlayerId: PlayerId;
  firstPlayerId: PlayerId;
  turnNumber: number;
  winnerId: PlayerId | null;
  reason: string | null;
  players: Record<PlayerId, PlayerState>;
  cards: Record<string, CardInstance>;
  definitions: Record<string, CardDefinition>;
  eventLog: GameEvent[];
  eventSeq: number;
  effectUsage: Record<string, { turnNumber: number; count: number }>;
  chain: ChainItem[];
  responseWindow: ResponseWindow | null;
  priorityPlayerId: PlayerId | null;
  consecutivePasses: number;
  pendingAttack: PendingAttack | null;
  pendingBattleResolution: PendingBattleResolution | null;
  chainSeq: number;
  scheduledEffects: ScheduledEffect[];
  pendingResolutions: PendingResolution[];
  pendingChoice: PendingChoice | null;
  pendingDeckSelection: PendingDeckSelection | null;
  pendingTriggerTargetSelection: PendingTriggerTargetSelection | null;
  pendingHandSelection: PendingHandSelection | null;
  scheduleSeq: number;
  pendingSeq: number;
  choiceSeq: number;
  deckSelectionSeq: number;
  triggerTargetSelectionSeq: number;
  handSelectionSeq: number;
  pendingTriggers: PendingTrigger[];
  triggerSeq: number;
  resolvingTriggerEvent: TriggerEventContext | null;
  currentTurnActivity: TurnActivity;
  previousTurnActivity: TurnActivity;
  revealPermissions: RevealPermission[];
}

export interface ClientLiveCardStatus {
  kind: "ONBOARDING" | "ATTACK_USED" | "ATTACK_RESTRICTED" | "KEYWORD" | "DESTRUCTION_SHIELD" | "ATTACK_LIMIT";
  label: string;
  detail?: string;
  sourceId?: string;
  sourceDefinitionId?: string;
  abilityId?: string;
  duration?: string;
}

export interface ClientCardView {
  instanceId: string;
  definitionId?: string;
  ownerId: PlayerId;
  controllerId: PlayerId;
  zone: Zone;
  faceUp: boolean;
  slot: number | null;
  onboarding?: boolean;
  attacksUsed?: number;
  maxAttacks?: number;
  currentPower?: number;
  powerBreakdown?: ClientPowerContribution[];
  liveStatuses?: ClientLiveCardStatus[];
}

export interface ClientPlayerView {
  id: PlayerId;
  reputation: number;
  maxCapacity: number;
  availableCapacity: number;
  handCount: number;
  deckCount: number;
  hand: ClientCardView[];
  employeeField: Array<ClientCardView | null>;
  supportField: Array<ClientCardView | null>;
  archive: ClientCardView[];
}

export interface ClientPendingDeckSelectionView {
  id: string;
  playerId: PlayerId;
  mode: "SEARCH" | "TOP";
  candidateIds: string[];
  visibleCards: ClientCardView[];
  min: number;
  max: number;
}


export interface ClientPendingResolutionView {
  id: string;
  sourceId: string;
  card: ClientCardView;
  controllerId: PlayerId;
  abilityId: string;
  dueTurnsStarted: number;
  phase: "MAIN";
}

export interface ClientScheduledEffectView {
  id: string;
  sourceId: string;
  controllerId: PlayerId;
  duePlayerId: PlayerId;
  dueTurnsStarted: number;
  phase: "START" | "MAIN" | "END";
}

export interface ClientPendingAttackView {
  attackerId: string;
  targetId: string | null;
  controllerId: PlayerId;
  cancelled: boolean;
}

export interface ClientChainItemView {
  id: string;
  position: number;
  sourceId: string | null;
  controllerId: PlayerId;
  abilityId?: string;
  negated: boolean;
  delayed: boolean;
  targets: Record<string, string[]>;
}

export interface ClientGameState {
  matchId: string;
  status: GameStatus;
  phase: Phase;
  activePlayerId: PlayerId;
  firstPlayerId: PlayerId;
  turnNumber: number;
  winnerId: PlayerId | null;
  reason: string | null;
  viewerId: PlayerId;
  players: Record<PlayerId, ClientPlayerView>;
  pendingChoice: null | { id: string; playerId: PlayerId; options: string[] };
  pendingDeckSelection: ClientPendingDeckSelectionView | null;
  pendingTriggerTargetSelection: null | { id: string; playerId: PlayerId; targetChoices: LegalTargetChoice[] };
  pendingHandSelection: null | { id: string; playerId: PlayerId; candidateIds: string[]; min: number; max: number };
  priorityPlayerId: PlayerId | null;
  responseWindow: ResponseWindow | null;
  chainLength: number;
  chain: ClientChainItemView[];
  pendingResolutions: ClientPendingResolutionView[];
  scheduledEffects: ClientScheduledEffectView[];
  pendingAttack: ClientPendingAttackView | null;
  lastEventSeq: number;
  stateVersion: number;
  legalActions: ClientLegalActions;
}

export interface ClientEvent {
  seq: number;
  type: EventType;
  playerId?: PlayerId;
  cardInstanceId?: string;
  data?: Record<string, unknown>;
}

export interface DeckFormat {
  id: string;
  deckSize: number;
  defaultCopyLimit: number;
  cardLimits?: Record<string, number>;
}

export interface DeckValidationResult {
  valid: boolean;
  errors: string[];
}

export interface LegalAttackOption {
  attackerId: string;
  targetIds: Array<string | null>;
}

export interface LegalTargetChoice {
  selectorId: string;
  min: number;
  max: number;
  candidateIds: string[];
}

export interface LegalEmployeePlayOption {
  cardId: string;
  options: Array<{ slot: number; promotionMaterialIds: string[] }>;
}

export interface LegalSupportPlayOption {
  cardId: string;
  slots: number[];
}

export interface LegalAbilityOption {
  sourceId: string;
  abilityId: string;
  targetChoices: LegalTargetChoice[];
}

export interface LegalResponseOption extends LegalAbilityOption {
  sourceType: "INCIDENT" | "IN_PLAY";
}

export interface ClientLegalActions {
  canMulligan: boolean;
  mulliganCardIds: string[];
  archiveExcessHandIds: string[];
  canAdvancePhase: boolean;
  canPassPriority: boolean;
  canResolveChoice: boolean;
  canResolveDeckSelection: boolean;
  canResolveTriggerTargetSelection: boolean;
  canResolveHandSelection: boolean;
  responseOptions: LegalResponseOption[];
  playableEmployees: LegalEmployeePlayOption[];
  playableActions: Array<{ cardId: string; targetChoices: LegalTargetChoice[] }>;
  playableSystems: LegalSupportPlayOption[];
  settableIncidents: LegalSupportPlayOption[];
  activatableAbilities: LegalAbilityOption[];
  attacks: LegalAttackOption[];
}

export type MatchIntent =
  | { type: "MULLIGAN"; returnIds: string[] }
  | { type: "ADVANCE_PHASE" }
  | { type: "ARCHIVE_EXCESS_HAND"; cardIds: string[] }
  | { type: "PLAY_EMPLOYEE"; cardId: string; slot: number; promotionMaterialIds?: string[] }
  | { type: "PLAY_SYSTEM"; cardId: string; slot: number }
  | { type: "SET_INCIDENT"; cardId: string; slot: number }
  | { type: "PLAY_ACTION"; cardId: string; targets?: Record<string, string[]> }
  | { type: "ACTIVATE_ABILITY"; sourceId: string; abilityId: string; targets?: Record<string, string[]> }
  | { type: "ACTIVATE_RESPONSE"; sourceId: string; abilityId: string; targets?: Record<string, string[]> }
  | { type: "DECLARE_ATTACK"; attackerId: string; targetId: string | null }
  | { type: "PASS_PRIORITY" }
  | { type: "RESOLVE_CHOICE"; choiceId: string; optionId: string }
  | { type: "RESOLVE_DECK_SELECTION"; selectionId: string; selectedIds: string[]; orderedUnselectedIds?: string[] }
  | { type: "RESOLVE_TRIGGER_TARGET_SELECTION"; selectionId: string; targets: Record<string, string[]> }
  | { type: "RESOLVE_HAND_SELECTION"; selectionId: string; selectedIds: string[] }
  | { type: "RESIGN" };

export interface MatchIntentCommand {
  intentId: string;
  matchId: string;
  playerId: PlayerId;
  expectedStateVersion: number;
  intent: MatchIntent;
}

export interface MatchCommandResponse {
  intentId: string;
  accepted: boolean;
  stateVersion: number;
  lastEventSeq: number;
  error?: { code: "STALE_STATE" | "RULES_ERROR" | "MATCH_MISMATCH" | "INTERNAL_ERROR"; message: string };
  events: ClientEvent[];
  view: ClientGameState;
}

export interface MatchCommandExecution {
  state: GameState;
  response: MatchCommandResponse;
}

export interface MatchSnapshot {
  schemaVersion: 1;
  state: GameState;
}

export interface DeckEntry {
  definitionId: string;
  copies: number;
}

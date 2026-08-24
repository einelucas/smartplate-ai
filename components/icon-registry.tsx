// components/icon-registry.tsx
// Registro central de ícones "de conteúdo" (conquistas, reações, níveis de
// cozinha) usando @phosphor-icons/react — substituindo emojis genéricos.
// Nunca usado para os ícones "de UI" (navbar, medidores, chrome geral), que
// continuam com lucide-react como já estavam (base44).
//
// Catálogos que cruzam a fronteira API/JSON (achievement-catalog.ts,
// achievements.ts) guardam só a CHAVE (string) do ícone — nunca o
// componente — porque um componente React não é serializável em JSON. Este
// arquivo é o único lugar que faz a ponte chave → componente.
"use client";

import {
  HandWavingIcon,
  FlaskIcon,
  IdentificationCardIcon,
  TargetIcon,
  CompassIcon,
  BowlFoodIcon,
  ForkKnifeIcon,
  SunHorizonIcon,
  SunIcon,
  MoonStarsIcon,
  CheckCircleIcon,
  SealCheckIcon,
  MedalIcon,
  StarIcon,
  ArrowsClockwiseIcon,
  DropIcon,
  WavesIcon,
  FireIcon,
  TrophyIcon,
  ScalesIcon,
  ChartBarIcon,
  ChartLineUpIcon,
  CameraIcon,
  ImagesIcon,
  CalendarCheckIcon,
  FlagCheckeredIcon,
  PersonSimpleRunIcon,
  TimerIcon,
  ChatCircleTextIcon,
  HandshakeIcon,
  UsersThreeIcon,
  HeartIcon,
  ChatCircleDotsIcon,
  SparkleIcon,
  PlantIcon,
  ThumbsUpIcon,
  HandsClappingIcon,
  BarbellIcon,
  BabyIcon,
  ChefHatIcon,
  QuestionIcon,
  PersonSimpleWalkIcon,
  BicycleIcon,
  PersonSimpleSwimIcon,
  SoccerBallIcon,
  BasketballIcon,
  FlowerLotusIcon,
  PersonSimpleTaiChiIcon,
  PulseIcon,
  DotsThreeOutlineIcon,
  WatchIcon,
  HeartbeatIcon,
  type Icon,
} from "@phosphor-icons/react";

export const ICON_REGISTRY = {
  HandWaving: HandWavingIcon,
  Flask: FlaskIcon,
  IdentificationCard: IdentificationCardIcon,
  Target: TargetIcon,
  Compass: CompassIcon,
  BowlFood: BowlFoodIcon,
  ForkKnife: ForkKnifeIcon,
  SunHorizon: SunHorizonIcon,
  Sun: SunIcon,
  MoonStars: MoonStarsIcon,
  CheckCircle: CheckCircleIcon,
  SealCheck: SealCheckIcon,
  Medal: MedalIcon,
  Star: StarIcon,
  ArrowsClockwise: ArrowsClockwiseIcon,
  Drop: DropIcon,
  Waves: WavesIcon,
  Fire: FireIcon,
  Trophy: TrophyIcon,
  Scales: ScalesIcon,
  ChartBar: ChartBarIcon,
  ChartLineUp: ChartLineUpIcon,
  Camera: CameraIcon,
  Images: ImagesIcon,
  CalendarCheck: CalendarCheckIcon,
  FlagCheckered: FlagCheckeredIcon,
  PersonSimpleRun: PersonSimpleRunIcon,
  Timer: TimerIcon,
  ChatCircleText: ChatCircleTextIcon,
  Handshake: HandshakeIcon,
  UsersThree: UsersThreeIcon,
  Heart: HeartIcon,
  ChatCircleDots: ChatCircleDotsIcon,
  Sparkle: SparkleIcon,
  Plant: PlantIcon,
  ThumbsUp: ThumbsUpIcon,
  HandsClapping: HandsClappingIcon,
  Barbell: BarbellIcon,
  Baby: BabyIcon,
  ChefHat: ChefHatIcon,
  // Tipos de atividade física (ver lib/activity/options.ts)
  PersonSimpleWalk: PersonSimpleWalkIcon,
  Bicycle: BicycleIcon,
  PersonSimpleSwim: PersonSimpleSwimIcon,
  SoccerBall: SoccerBallIcon,
  Basketball: BasketballIcon,
  FlowerLotus: FlowerLotusIcon,
  PersonSimpleTaiChi: PersonSimpleTaiChiIcon,
  Pulse: PulseIcon,
  DotsThreeOutline: DotsThreeOutlineIcon,
  // Connected Apps (ver app/profile/connected-apps/page.tsx)
  Watch: WatchIcon,
  Heartbeat: HeartbeatIcon,
} satisfies Record<string, Icon>;

export type IconKey = keyof typeof ICON_REGISTRY;

/** Resolve uma chave de ícone salva em catálogo/banco para o componente real. Nunca quebra em chave desconhecida. */
export function resolveIcon(key: string | undefined | null): Icon {
  if (key && key in ICON_REGISTRY) return ICON_REGISTRY[key as IconKey];
  return QuestionIcon;
}

export type HealthFactorKey = 'responsiveness' | 'satisfaction' | 'quality'

export type BusinessHealthSnapshot = {
  responsiveness: number
  satisfaction: number
  quality: number
  previousOverall: number
  updatedAt: string
  insight: string
}

export const HEALTH_FACTOR_META: Record<HealthFactorKey, { label: string; shortLabel: string; description: string; recommendation: string }> = {
  responsiveness: {
    label: 'Responsiveness',
    shortLabel: 'Resp.',
    description: 'How quickly this venue responds to booking requests.',
    recommendation: 'Respond to pending bookings promptly and keep guests updated when plans change.',
  },
  satisfaction: {
    label: 'Satisfaction',
    shortLabel: 'Satis.',
    description: 'Average customer satisfaction from post-visit reviews.',
    recommendation: 'Review recent customer feedback and follow up on issues that appear more than once.',
  },
  quality: {
    label: 'Quality',
    shortLabel: 'Qual.',
    description: 'Consistency of food, service, and overall experience.',
    recommendation: 'Review service consistency, item availability, and recent quality feedback with your team.',
  },
}

const HEALTH_SNAPSHOTS: Record<string, BusinessHealthSnapshot> = {
  shiro: {
    responsiveness: 86,
    satisfaction: 94,
    quality: 92,
    previousOverall: 93,
    updatedAt: 'Updated 5 min ago',
    insight: 'Response speed has dipped. Two booking requests still need attention.',
  },
  landmark: {
    responsiveness: 91,
    satisfaction: 93,
    quality: 90,
    previousOverall: 90,
    updatedAt: 'Updated 12 min ago',
    insight: 'Guest response times are improving across recent requests.',
  },
  filmhouse: {
    responsiveness: 83,
    satisfaction: 90,
    quality: 88,
    previousOverall: 89,
    updatedAt: 'Updated 8 min ago',
    insight: 'Faster responses to screening requests can lift your score.',
  },
  zenSpa: {
    responsiveness: 95,
    satisfaction: 98,
    quality: 96,
    previousOverall: 95,
    updatedAt: 'Updated 18 min ago',
    insight: 'Customer satisfaction remains your strongest signal.',
  },
  quilox: {
    responsiveness: 72,
    satisfaction: 89,
    quality: 83,
    previousOverall: 86,
    updatedAt: 'Updated 3 min ago',
    insight: 'Responsiveness is falling and needs attention before tonight’s peak.',
  },
}

const HEALTH_ALIASES: Record<string, string> = {
  v1: 'shiro',
  v2: 'landmark',
  v3: 'filmhouse',
  'shiro lagos': 'shiro',
  'landmark beach': 'landmark',
  'filmhouse cinemas': 'filmhouse',
  'zen spa & wellness': 'zenSpa',
  'quilox nightclub': 'quilox',
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

function fallbackSnapshot(rating: number): BusinessHealthSnapshot {
  const base = Number.isFinite(rating) ? rating : 4.5
  return {
    responsiveness: Math.min(99, Math.round((base - 4) * 85 + 55)),
    satisfaction: Math.min(99, Math.round((base - 4) * 90 + 52)),
    quality: Math.min(99, Math.round((base - 4) * 80 + 58)),
    previousOverall: Math.min(99, Math.round(base * 20)),
    updatedAt: 'Updated recently',
    insight: 'Keep delivering consistent service to protect your customer score.',
  }
}

export function resolveBusinessHealth(key: string, rating = 4.5) {
  const normalizedKey = key.trim().toLowerCase()
  const canonicalKey = HEALTH_ALIASES[key] ?? HEALTH_ALIASES[normalizedKey] ?? key
  const source = HEALTH_SNAPSHOTS[canonicalKey] ?? fallbackSnapshot(rating)
  const snapshot = {
    ...source,
    responsiveness: clamp(source.responsiveness),
    satisfaction: clamp(source.satisfaction),
    quality: clamp(source.quality),
  }
  const factors: HealthFactorKey[] = ['responsiveness', 'satisfaction', 'quality']
  const overall = Math.round(factors.reduce((total, factor) => total + snapshot[factor], 0) / factors.length)
  const delta = overall - clamp(snapshot.previousOverall)
  const focus = factors.reduce((lowest, factor) => snapshot[factor] < snapshot[lowest] ? factor : lowest)
  const status = overall >= 85
    ? { label: 'Excellent', color: '#16A34A' }
    : overall >= 70
      ? { label: 'Good', color: '#F59E0B' }
      : { label: 'Needs attention', color: '#EF4444' }

  return { ...snapshot, overall, delta, focus, status }
}

import { ref, computed } from 'vue'
import { usePrizeStore } from './usePrizeStore'
import type { Prize } from './usePrizeStore'

export type SpinPhase = 'idle' | 'spinning' | 'stopped'

export function useWheelState() {
  const { prizes } = usePrizeStore()
  const rotation = ref(0)
  const phase = ref<SpinPhase>('idle')
  const winResult = ref<Prize | null>(null)
  const flashingSegment = ref<number | null>(null)
  let currentRotation = 0

  const segmentAngle = computed(() => prizes.value.length > 0 ? 360 / prizes.value.length : 360)

  function selectRandomPrize(): Prize {
    const total = prizes.value.reduce((sum, p) => sum + p.probability, 0)
    const rand = Math.random() * total
    let cumulative = 0
    for (const prize of prizes.value) {
      cumulative += prize.probability
      if (rand <= cumulative) return prize
    }
    return prizes.value[0]
  }

  const spin = () => {
    if (phase.value === 'spinning' || prizes.value.length === 0) return

    const prize = selectRandomPrize()
    const prizeIndex = prizes.value.findIndex(p => p.id === prize.id)
    const segAngle = segmentAngle.value
    const segmentMiddle = prizeIndex * segAngle + segAngle / 2
    const fullSpins = (5 + Math.floor(Math.random() * 4)) * 360
    const targetRotation = currentRotation + fullSpins + (360 - segmentMiddle)

    currentRotation = targetRotation
    rotation.value = targetRotation
    phase.value = 'spinning'
    winResult.value = null
    flashingSegment.value = null

    setTimeout(() => {
      phase.value = 'stopped'
      winResult.value = prize
      flashingSegment.value = prizeIndex
      setTimeout(() => { flashingSegment.value = null }, 600)
    }, 4000)
  }

  const reset = () => {
    phase.value = 'idle'
    winResult.value = null
    flashingSegment.value = null
  }

  return { rotation, phase, winResult, flashingSegment, spin, reset, prizes }
}

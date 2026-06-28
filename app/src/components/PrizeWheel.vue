<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { gsap } from 'gsap';
import { usePrizeStore } from '@/hooks/usePrizeStore';
import type { SpinPhase } from '@/hooks/useWheelState';

interface Props {
  rotation: number;
  phase: SpinPhase;
  flashingSegment: number | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['spin']);

const { prizes } = usePrizeStore();

const WHEEL_SIZE = 480;
const CENTER_SIZE = 130;

const segmentAngle = computed(() => prizes.value.length > 0 ? 360 / prizes.value.length : 360);

const wheelRef = ref<HTMLElement | null>(null);
const isFirstRender = ref(true);

const gradientStops = computed(() => {
  if (prizes.value.length === 0) return 'none';
  return prizes.value.map((prize, i) => {
    const start = i * segmentAngle.value;
    const end = (i + 1) * segmentAngle.value;
    return `${prize.color} ${start}deg ${end}deg`;
  }).join(', ');
});

const lightBulbs = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * 360;
  const rad = (angle * Math.PI) / 180;
  const radius = WHEEL_SIZE / 2 + 12;
  const x = Math.cos(rad) * radius + WHEEL_SIZE / 2;
  const y = Math.sin(rad) * radius + WHEEL_SIZE / 2;
  const color = i % 2 === 0 ? '#F26522' : '#FF8A4C';
  return { id: i, x, y, color, delay: i * 0.083 };
});

watch(() => props.rotation, (newRotation) => {
  if (!wheelRef.value) return;
  if (isFirstRender.value) {
    gsap.set(wheelRef.value, { rotation: newRotation });
    isFirstRender.value = false;
  } else {
    gsap.to(wheelRef.value, { rotation: newRotation, duration: 4, ease: 'power2.out' });
  }
});
</script>

<template>
  <div class="relative flex items-center justify-center" :style="{ width: WHEEL_SIZE + 60 + 'px', height: WHEEL_SIZE + 60 + 'px' }">
    <div
      class="absolute rounded-full"
      :style="{
        width: WHEEL_SIZE + 44 + 'px',
        height: WHEEL_SIZE + 44 + 'px',
        backgroundColor: '#1A1A22',
        border: '3px solid #F26522',
        boxShadow: '0 0 40px rgba(242,101,34,0.25), inset 0 0 20px rgba(0,0,0,0.5)',
        animation: 'wheel-glow 3s ease-in-out infinite',
        zIndex: 1,
      }"
    />
    <div
      v-for="bulb in lightBulbs"
      :key="bulb.id"
      class="absolute rounded-full"
      :style="{
        width: '8px', height: '8px', backgroundColor: bulb.color,
        left: bulb.x - 4 + 'px', top: bulb.y - 4 + 'px',
        animation: `bulb-pulse ${phase === 'spinning' ? '0.5s' : '2s'} ease-in-out infinite`,
        animationDelay: `${bulb.delay}s`, boxShadow: `0 0 6px ${bulb.color}`, zIndex: 5,
      }"
    />
    <div
      class="absolute z-10"
      :style="{
        top: '-8px', left: '50%', transform: 'translateX(-50%)',
        width: '0', height: '0',
        borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '28px solid #F26522',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
      }"
    >
      <div :style="{ position: 'absolute', top: '-30px', left: '-10px', width: '20px', height: '20px', backgroundColor: '#F26522', borderRadius: '50%', border: '2px solid #FFFFFF' }" />
    </div>
    <div
      ref="wheelRef"
      class="relative rounded-full"
      :style="{
        width: WHEEL_SIZE + 'px', height: WHEEL_SIZE + 'px',
        background: `conic-gradient(from 0deg, ${gradientStops})`,
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 40px rgba(242,101,34,0.2)',
        zIndex: 2,
      }"
    >
      <div
        v-for="(prize, i) in prizes"
        :key="prize.id"
        class="absolute text-center"
        :style="{
          left: (Math.cos(((i * segmentAngle + segmentAngle / 2) * Math.PI) / 180) * (WHEEL_SIZE * 0.32) + WHEEL_SIZE / 2) + 'px',
          top: (Math.sin(((i * segmentAngle + segmentAngle / 2) * Math.PI) / 180) * (WHEEL_SIZE * 0.32) + WHEEL_SIZE / 2) + 'px',
          transform: `translate(-50%, -50%) rotate(${i * segmentAngle + segmentAngle / 2 + 90}deg)`,
          width: '110px', zIndex: 3,
        }"
      >
        <div class="text-white font-bold text-[11px] leading-tight tracking-wide uppercase" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8)">
          {{ prize.swahiliName }}
        </div>
        <div v-if="prize.amount" class="text-white font-black text-lg leading-tight mt-0.5" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8)">
          {{ prize.amount }}
        </div>
        <div v-if="prize.subtitle" class="text-white/80 font-bold text-[10px] leading-tight mt-0.5 uppercase" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8)">
          {{ prize.subtitle }}
        </div>
        <div class="text-white/70 font-semibold text-[10px] leading-tight mt-0.5">
          {{ prize.probability }}%
        </div>
      </div>
      <div
        v-if="flashingSegment !== null"
        class="absolute inset-0 rounded-full pointer-events-none"
        :style="{
          background: `conic-gradient(from ${flashingSegment * segmentAngle}deg, transparent 0deg, rgba(255,255,255,0.5) ${segmentAngle / 2}deg, transparent ${segmentAngle}deg)`,
          animation: 'segment-flash 0.6s ease-out', zIndex: 4,
        }"
      />
    </div>
    <button
      @click="emit('spin')"
      :disabled="phase === 'spinning'"
      class="absolute rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed"
      :style="{
        width: CENTER_SIZE + 'px', height: CENTER_SIZE + 'px',
        background: 'linear-gradient(145deg, #F26522, #E85A18)',
        border: '4px solid #FF8A4C',
        boxShadow: '0 0 30px rgba(242,101,34,0.5), inset 0 2px 4px rgba(255,255,255,0.2)',
        zIndex: 6,
      }"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="mb-1">
        <circle cx="6" cy="10" r="5" fill="white" />
        <path d="M12 5C14.5 5 16 8 16 10C16 12 14.5 15 12 15" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
      <span class="text-white font-black text-2xl tracking-[2px]">{{ phase === 'spinning' ? '...' : 'SPIN' }}</span>
    </button>
  </div>
</template>

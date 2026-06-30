<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { gsap } from 'gsap';
import { usePrizeStore, computeProbability } from '@/hooks/usePrizeStore';
import type { SpinPhase } from '@/hooks/useWheelState';
import { playTick } from '@/utils/audio';
import braceletImg from '@/assets/prizes/bracelet.png';
import capImg from '@/assets/prizes/cap.png';
import penKeyholderImg from '@/assets/prizes/pen-keyholder.png';
import voucher500Img from '@/assets/prizes/voucher-500.png';
import voucher2000Img from '@/assets/prizes/voucher-2000.png';
import voucher5000Img from '@/assets/prizes/voucher-5000.png';
import halotelLogoW from '@/assets/Halote logo white-02.svg';

interface Props {
  rotation: number;
  phase: SpinPhase;
  flashingSegment: number | null;
}
const props = defineProps<Props>();
const emit = defineEmits(['spin']);

const { prizes } = usePrizeStore();

const prizeImgs: Record<string, string> = {
  bracelets: braceletImg,
  cap: capImg,
  pen_keyholder: penKeyholderImg,
  voucher_500: voucher500Img,
  voucher_2000: voucher2000Img,
  voucher_5000: voucher5000Img,
};

// ── Responsive sizing ────────────────────────────────────────
const viewportH = ref(window.innerHeight);
const viewportW = ref(window.innerWidth);
const onResize = () => { viewportH.value = window.innerHeight; viewportW.value = window.innerWidth; };
onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));

// In the 3/6/3 grid the center column is ~50% of viewport minus gutters
const ws = computed(() => {
  const fromH = viewportH.value - 224;
  const fromW = Math.max(240, viewportW.value * 0.5 - 140);
  return Math.min(480, Math.max(280, Math.min(fromH, fromW)));
});
const cs = computed(() => Math.round(ws.value * 0.272));   // center button
const container = computed(() => ws.value + 80);
const center    = computed(() => container.value / 2);
const bulbR     = computed(() => ws.value / 2 + 18);

const lightBulbs = computed(() =>
  Array.from({ length: 28 }, (_, i) => {
    const rad = ((i / 28) * 360 * Math.PI) / 180;
    return {
      id: i,
      x: Math.cos(rad) * bulbR.value + center.value,
      y: Math.sin(rad) * bulbR.value + center.value,
      color: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#F26522' : '#FF8A4C',
      delay: (i * 0.071).toFixed(2),
    };
  })
);
// ─────────────────────────────────────────────────────────────

const segmentAngle = computed(() => prizes.value.length > 0 ? 360 / prizes.value.length : 360);

function segXY(i: number, rFactor: number) {
  // csa is the CSS/conic angle (0 = North/top, clockwise) for the segment centre
  const csa = i * segmentAngle.value + segmentAngle.value / 2;
  // Convert CSS angle → math radians (East = 0, clockwise in CSS coords) by subtracting 90°
  const rad = ((csa - 90) * Math.PI) / 180;
  const r = rFactor * ws.value;
  return {
    left: (Math.cos(rad) * r + ws.value / 2) + 'px',
    top:  (Math.sin(rad) * r + ws.value / 2) + 'px',
    transform: `translate(-50%, -50%) rotate(${csa}deg)`,
  };
}

const gradientStops = computed(() => {
  if (prizes.value.length === 0) return '#333';
  return prizes.value.map((prize, i) => {
    const s = i * segmentAngle.value;
    const e = (i + 1) * segmentAngle.value;
    return `${prize.color} ${s}deg ${e}deg`;
  }).join(', ');
});

const wheelRef = ref<HTMLElement | null>(null);
let spinTween: ReturnType<typeof gsap.to> | null = null;
let lastTickSegment = -1;

watch(() => props.rotation, (newRotation) => {
  if (!wheelRef.value) return;
  if (spinTween) spinTween.kill();
  lastTickSegment = -1;
  const segAngle = segmentAngle.value;
  spinTween = gsap.to(wheelRef.value, {
    rotation: newRotation,
    duration: 7,
    ease: 'power2.out',
    onUpdate() {
      if (!wheelRef.value || prizes.value.length === 0) return;
      const rot = gsap.getProperty(wheelRef.value, 'rotation') as number;
      const seg = Math.floor(((rot % 360) + 360) % 360 / segAngle) % prizes.value.length;
      if (seg !== lastTickSegment) {
        playTick(1 - (spinTween?.progress() ?? 0));
        lastTickSegment = seg;
      }
    },
  });
});
</script>

<template>
  <div
    class="relative flex items-center justify-center flex-shrink-0"
    :style="{ width: container + 'px', height: container + 'px' }"
  >
    <!-- Outer glow ring -->
    <div
      class="absolute rounded-full"
      :style="{
        width: ws + 50 + 'px', height: ws + 50 + 'px',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        border: '2px solid rgba(242,101,34,0.3)',
        boxShadow: '0 0 60px rgba(242,101,34,0.2)',
        animation: 'wheel-glow 3s ease-in-out infinite',
        zIndex: 1,
      }"
    />

    <!-- Light bulbs -->
    <div
      v-for="bulb in lightBulbs"
      :key="bulb.id"
      class="absolute rounded-full"
      :style="{
        width: '9px', height: '9px',
        backgroundColor: bulb.color,
        left: bulb.x - 4.5 + 'px',
        top:  bulb.y - 4.5 + 'px',
        boxShadow: `0 0 8px 2px ${bulb.color}`,
        animation: `bulb-pulse ${props.phase === 'spinning' ? '0.35s' : '1.8s'} ease-in-out infinite`,
        animationDelay: `${bulb.delay}s`,
        zIndex: 5,
      }"
    />

    <!-- Pin pointer -->
    <svg
      width="34" height="52" viewBox="0 0 34 52" fill="none"
      class="absolute z-20"
      :style="{ top: '-14px', left: '50%', transform: 'translateX(-50%)', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))' }"
    >
      <path d="M17 0C7.611 0 0 7.611 0 17C0 29.75 17 52 17 52S34 29.75 34 17C34 7.611 26.389 0 17 0Z" fill="#F26522"/>
      <circle cx="17" cy="17" r="8" fill="white" opacity="0.9"/>
    </svg>

    <!-- Wheel disc -->
    <div
      ref="wheelRef"
      class="relative rounded-full overflow-hidden"
      :style="{
        width: ws + 'px', height: ws + 'px',
        background: prizes.length > 0 ? `conic-gradient(from 0deg, ${gradientStops})` : '#1A1A22',
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)',
        zIndex: 2,
      }"
    >
      <!-- Dividers -->
      <div
        v-for="(_, i) in prizes" :key="`div-${i}`"
        class="absolute"
        :style="{
          left: '50%', top: '50%', width: '1px', height: '50%',
          background: 'rgba(0,0,0,0.25)',
          transformOrigin: 'top center',
          transform: `rotate(${i * segmentAngle}deg)`,
          zIndex: 3,
        }"
      />

      <!-- Prize images (inner) -->
      <div
        v-for="(prize, i) in prizes" :key="`img-${prize.id}`"
        class="absolute"
        :style="{ ...segXY(i, 0.21), width: ws * 0.09 + 'px', height: ws * 0.09 + 'px', zIndex: 4 }"
      >
        <img v-if="prizeImgs[prize.id]" :src="prizeImgs[prize.id]" :alt="prize.name"
          class="w-full h-full object-contain"
          style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7))" />
        <span v-else
          style="font-size:1.4em;display:flex;align-items:center;justify-content:center;width:100%;height:100%;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.7))"
        >{{ prize.id === 'jaribu' ? '🔄' : '🙏' }}</span>
      </div>

      <!-- Prize text labels (outer) -->
      <div
        v-for="(prize, i) in prizes" :key="`label-${prize.id}`"
        class="absolute text-center"
        :style="{ ...segXY(i, 0.375), width: ws * 0.175 + 'px', zIndex: 4 }"
      >
        <div class="font-bold leading-tight uppercase"
          style="font-size:9px;color:white;text-shadow:0 1px 4px rgba(0,0,0,1);letter-spacing:0.3px;"
        >{{ prize.swahiliName }}</div>
      </div>

      <!-- Win flash -->
      <div v-if="flashingSegment !== null"
        class="absolute inset-0 rounded-full pointer-events-none"
        :style="{
          background: `conic-gradient(from ${flashingSegment * segmentAngle}deg, transparent 0deg, rgba(255,255,255,0.55) ${segmentAngle/2}deg, transparent ${segmentAngle}deg)`,
          animation: 'segment-flash 0.6s ease-out',
          zIndex: 5,
        }"
      />
    </div>

    <!-- Center SPIN button -->
    <button
      @click="emit('spin')"
      :disabled="phase === 'spinning'"
      class="absolute rounded-full flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed"
      :style="{
        width: cs + 'px', height: cs + 'px', zIndex: 6,
        background: 'linear-gradient(145deg, #FF6B00, #E65C00)',
        border: '6px solid #FFD700',
        boxShadow: '0 0 40px rgba(242,101,34,0.7), inset 0 2px 10px rgba(255,255,255,0.4)',
        transition: 'transform 0.15s',
      }"
      @mouseenter="(e: MouseEvent) => { if (phase !== 'spinning') (e.currentTarget as HTMLElement).style.transform='scale(1.07)' }"
      @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.transform='scale(1)' }"
      @mousedown="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.transform='scale(0.95)' }"
      @mouseup="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.transform='scale(1.07)' }"
    >
      <img :src="halotelLogoW" alt="halotel" :style="{ height: cs * 0.28 + 'px', width: 'auto', marginBottom: '6px', opacity: '0.9' }" />
      <span :style="{ color:'white', fontWeight:'900', fontSize: cs * 0.145 + 'px', letterSpacing:'3px', lineHeight:'1' }">
        {{ phase === 'spinning' ? '···' : 'SPIN' }}
      </span>
    </button>
  </div>
</template>

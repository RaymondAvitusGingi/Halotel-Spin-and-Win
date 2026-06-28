<script setup lang="ts">
import PrizeWheel from '@/components/PrizeWheel.vue';
import ResultPanel from '@/components/ResultPanel.vue';
import ConfettiField from '@/components/ConfettiField.vue';
import type { Prize } from '@/hooks/usePrizeStore';
import type { SpinPhase } from '@/hooks/useWheelState';

interface Props {
  rotation: number;
  phase: SpinPhase;
  winResult: Prize | null;
  flashingSegment: number | null;
}

defineProps<Props>();
const emit = defineEmits(['spin', 'spinAgain']);
</script>

<template>
  <section
    id="hero"
    class="relative h-full overflow-hidden"
    :style="{
      background: `
        radial-gradient(ellipse at 50% 30%, rgba(242,101,34,0.15) 0%, transparent 65%),
        radial-gradient(ellipse at 80% 80%, rgba(242,101,34,0.05) 0%, transparent 50%),
        #0A0A0F
      `,
    }"
  >
    <ConfettiField :count="40" />

    <!-- Ornaments -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute top-[15%] left-[3%] w-2 h-2 rounded-full" style="background: #F26522; box-shadow: 0 0 20px #F26522; animation: pulse-glow 3s ease-in-out infinite;" />
      <div class="absolute top-[10%] right-[10%] w-1.5 h-1.5 rounded-full" style="background: #FFD700; box-shadow: 0 0 15px #FFD700; animation: pulse-glow 4s ease-in-out infinite; animation-delay: 1s;" />
      <div class="absolute bottom-[20%] left-[5%] w-1 h-1 rounded-full" style="background: #FF8A4C; box-shadow: 0 0 12px #FF8A4C; animation: pulse-glow 2.5s ease-in-out infinite; animation-delay: 0.5s;" />
      <div class="absolute top-[30%] left-[8%] w-3 h-3 rotate-45" style="border: 1px solid rgba(242,101,34,0.25); animation: pulse-glow 5s ease-in-out infinite;" />
      <div class="absolute top-[50%] right-[5%] w-2 h-2 rotate-45" style="border: 1px solid rgba(255,215,0,0.25); animation: pulse-glow 4s ease-in-out infinite; animation-delay: 2s;" />
      <div class="absolute bottom-[10%] right-[30%] w-1 h-1 rotate-45" style="border: 1px solid rgba(242,101,34,0.2); animation: pulse-glow 3s ease-in-out infinite; animation-delay: 1.5s;" />
      <div class="absolute top-[25%] left-[1%] w-20 h-20 rounded-full" style="border: 1px solid rgba(242,101,34,0.06);" />
      <div class="absolute bottom-[5%] right-[2%] w-28 h-28 rounded-full" style="border: 1px solid rgba(242,101,34,0.05);" />
      <div class="absolute top-[60%] left-[15%] w-12 h-12 rounded-full" style="border: 1px solid rgba(255,215,0,0.05);" />
      <!-- Sparkle stars -->
      <svg class="absolute top-[20%] left-[15%]" width="18" height="18" viewBox="0 0 20 20" style="animation: float-up 6s ease-in-out infinite;">
        <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8Z" fill="#F26522" opacity="0.35" />
      </svg>
      <svg class="absolute top-[35%] right-[12%]" width="12" height="12" viewBox="0 0 20 20" style="animation: float-up 8s ease-in-out infinite; animation-delay: 2s;">
        <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8Z" fill="#FFD700" opacity="0.25" />
      </svg>
      <svg class="absolute bottom-[25%] right-[20%]" width="14" height="14" viewBox="0 0 20 20" style="animation: float-up 7s ease-in-out infinite; animation-delay: 4s;">
        <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8Z" fill="#FF8A4C" opacity="0.25" />
      </svg>
      <!-- Decorative curved lines -->
      <svg class="absolute top-[10%] left-[30%]" width="120" height="60" viewBox="0 0 120 60" fill="none">
        <path d="M0 30C20 10 40 30 60 20S100 10 120 25" stroke="rgba(242,101,34,0.08)" stroke-width="1" fill="none" />
      </svg>
      <svg class="absolute bottom-[15%] right-[10%]" width="100" height="50" viewBox="0 0 100 50" fill="none">
        <path d="M0 25C20 5 40 25 60 15S80 5 100 20" stroke="rgba(255,215,0,0.06)" stroke-width="1" fill="none" />
      </svg>
    </div>

    <div class="relative z-10 h-full flex items-center pt-14">
      <div class="w-full max-w-[1400px] mx-auto px-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center h-full">

          <!-- LEFT COLUMN - Branding -->
          <div class="hero-left lg:col-span-3 flex flex-col items-center lg:items-start text-center lg:text-left">
            <img src="@/assets/Halotel logo-02.svg" alt="Halotel" class="h-9 w-auto mb-5" />
            <div class="mb-3">
              <h1 class="font-black text-5xl lg:text-6xl xl:text-[72px] leading-[0.9] tracking-[-2px] text-white" style="text-shadow: 0 4px 30px rgba(242,101,34,0.3)">
                SPIN
              </h1>
              <h1 class="font-black text-5xl lg:text-6xl xl:text-[72px] leading-[0.9] tracking-[-2px]" style="text-shadow: 0 4px 30px rgba(242,101,34,0.3)">
                <span class="text-[#F26522] text-4xl lg:text-5xl xl:text-[64px]">&amp;</span>
                <span class="text-white"> WIN</span>
              </h1>
            </div>
            <div class="inline-block px-4 py-1.5 rounded mb-4" style="background-color: #F26522">
              <span class="text-white font-extrabold text-sm lg:text-base tracking-[1px] uppercase">MSIMU WA SABASABA</span>
            </div>
            <p class="text-white font-semibold text-sm lg:text-base mb-6">SPIN, SHINDA NA HALOTEL!</p>
            <div class="w-40 lg:w-44" style="animation: heart-float 3s ease-in-out infinite; filter: drop-shadow(0 0 20px rgba(242,101,34,0.4));">
              <img src="@/assets/Artboard 1.png" alt="Halotel Saba Saba 77" class="w-full h-auto" />
            </div>
          </div>

          <!-- CENTER COLUMN - Wheel -->
          <div id="wheel" class="hero-wheel-area lg:col-span-5 flex justify-center">
            <PrizeWheel :rotation="rotation" :phase="phase" :flashingSegment="flashingSegment" @spin="emit('spin')" />
          </div>

          <!-- RIGHT COLUMN - Result -->
          <div class="hero-right lg:col-span-4">
            <ResultPanel :winResult="winResult" :phase="phase" @spinAgain="emit('spinAgain')" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

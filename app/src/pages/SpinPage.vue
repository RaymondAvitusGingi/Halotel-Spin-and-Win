<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { gsap } from 'gsap';
import HeroWheelSection from '@/sections/HeroWheelSection.vue';
import { useWheelState } from '@/hooks/useWheelState';

const { rotation, phase, winResult, flashingSegment, spin, reset } = useWheelState();
const pageRef = ref<HTMLElement | null>(null);

nextTick(() => {
  if (!pageRef.value) return;
  gsap.fromTo(pageRef.value,
    { opacity: 0 },
    { opacity: 1, duration: 0.6, ease: 'power2.out' }
  );
});
</script>

<template>
  <div ref="pageRef" style="padding-top:64px;opacity:0;">
    <HeroWheelSection
      :rotation="rotation" :phase="phase" :winResult="winResult"
      :flashingSegment="flashingSegment" @spin="spin" @spinAgain="reset" />
  </div>
</template>

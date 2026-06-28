<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { gsap } from 'gsap';
import Navbar from '@/components/Navbar.vue';
import HeroWheelSection from '@/sections/HeroWheelSection.vue';
import AdminDashboard from '@/components/AdminDashboard.vue';
import { useWheelState } from '@/hooks/useWheelState';

const { rotation, phase, winResult, flashingSegment, spin, reset } = useWheelState();
const pageRef = ref<HTMLElement | null>(null);
const currentView = ref<'user' | 'admin'>('user');

function runEntranceAnimation() {
  if (!pageRef.value) return;
  gsap.set(pageRef.value, { opacity: 0 });
  gsap.set('.navbar', { y: -30, opacity: 0 });
  gsap.set('.hero-left', { y: 30, opacity: 0 });
  gsap.set('.hero-wheel-area', { scale: 0.85, opacity: 0 });
  gsap.set('.hero-right', { x: 40, opacity: 0 });

  const tl = gsap.timeline();
  tl.to(pageRef.value, { opacity: 1, duration: 0.4 })
    .to('.navbar', { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.2)
    .to('.hero-left', { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.4)
    .to('.hero-wheel-area', { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.5)' }, 0.7)
    .to('.hero-right', { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, 1.0);
}

watch(currentView, async (view) => {
  if (view === 'user') {
    await nextTick();
    runEntranceAnimation();
  }
}, { immediate: true });

const handleSpinAgain = () => reset();
</script>

<template>
  <div class="min-h-screen">
    <Navbar class="navbar" :currentView="currentView" @update:currentView="currentView = $event" />

    <div v-if="currentView === 'user'" class="fixed inset-0" style="top: 56px;">
      <div ref="pageRef" class="h-full" style="opacity: 0;">
        <HeroWheelSection
          :rotation="rotation" :phase="phase" :winResult="winResult"
          :flashingSegment="flashingSegment" @spin="spin" @spinAgain="handleSpinAgain" />
      </div>
    </div>

    <div v-else class="admin-wrapper" style="padding-top: 56px;">
      <AdminDashboard />
    </div>
  </div>
</template>

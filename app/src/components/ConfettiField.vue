<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  count?: number;
  colors?: string[];
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  count: 40,
  colors: () => ['#FFD700', '#F26522', '#FF8A4C', '#8B2F8B', '#FF6B9D', '#FFFFFF'],
  class: ''
});

const particles = computed(() => {
  return Array.from({ length: props.count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    color: props.colors[Math.floor(Math.random() * props.colors.length)],
    size: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
    duration: 4 + Math.random() * 3,
    delay: Math.random() * 5,
    opacity: 0.4 + Math.random() * 0.6,
    isDiamond: Math.random() > 0.5,
  }));
});
</script>

<template>
  <div :class="`absolute inset-0 pointer-events-none overflow-hidden ${props.class}`">
    <div
      v-for="p in particles"
      :key="p.id"
      class="absolute"
      :style="{
        left: p.left,
        top: p.top,
        width: p.isDiamond ? `${p.size}px` : `${p.size * 0.6}px`,
        height: p.isDiamond ? `${p.size}px` : `${p.size * 1.3}px`,
        backgroundColor: p.color,
        borderRadius: p.isDiamond ? '0' : '1px',
        transform: `rotate(${p.rotation}deg)`,
        opacity: p.opacity,
        animation: `confetti-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
        zIndex: 1,
      }"
    />
  </div>
</template>

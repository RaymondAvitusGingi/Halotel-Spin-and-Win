<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
  currentView: 'user' | 'admin';
}

const props = defineProps<Props>();
const emit = defineEmits<{ 'update:currentView': [view: 'user' | 'admin'] }>();

const scrolled = ref(false);

const handleScroll = () => {
  scrolled.value = window.scrollY > 50;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-8 transition-shadow duration-300"
    :style="{
      backgroundColor: '#F26522',
      boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.2)' : 'none',
    }"
  >
    <a href="#hero" class="flex-shrink-0">
      <img src="@/assets/Halote logo white-02.svg" alt="Halotel" class="h-8 w-auto" />
    </a>

    <div class="flex items-center gap-4">
      <button
        @click="emit('update:currentView', 'user')"
        class="text-sm font-semibold tracking-wide transition-all duration-200 px-3 py-1.5 rounded-lg"
        :style="{ 
          backgroundColor: props.currentView === 'user' ? 'rgba(255,255,255,0.2)' : 'transparent',
          color: '#FFFFFF'
        }"
      >
        Spin & Win
      </button>
      <button
        @click="emit('update:currentView', 'admin')"
        class="text-sm font-semibold tracking-wide transition-all duration-200 px-3 py-1.5 rounded-lg"
        :style="{ 
          backgroundColor: props.currentView === 'admin' ? 'rgba(255,255,255,0.2)' : 'transparent',
          color: '#FFFFFF'
        }"
      >
        Admin
      </button>
    </div>
  </nav>
</template>

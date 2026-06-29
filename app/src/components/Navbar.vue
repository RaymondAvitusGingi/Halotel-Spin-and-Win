<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const scrolled = ref(false);
const handleScroll = () => { scrolled.value = window.scrollY > 10; };
onMounted(() => window.addEventListener('scroll', handleScroll));
onUnmounted(() => window.removeEventListener('scroll', handleScroll));
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :style="{
      height: '64px',
      background: scrolled ? '#E84D02' : 'transparent',
      boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
      borderBottom: scrolled ? 'none' : '1px solid rgba(255,255,255,0.15)'
    }"
  >
    <div class="h-full flex items-center justify-between max-w-[1400px] mx-auto px-6 gap-6">

      <!-- Left: Logo -->
      <a href="https://www.halotel.co.tz" target="_blank" rel="noopener" class="flex-shrink-0">
        <img src="@/assets/Halote logo white-02.svg" alt="Halotel" style="height:60px;width:auto;" />
      </a>

      <!-- Center: Big Title -->
      <div class="hidden md:flex flex-1 justify-center text-center">
        <h1 class="text-white font-black italic tracking-wide" style="font-size: 20px; text-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          MyHalo: <span style="color:#FFD700;">Enjoy your Ultimate Digital Experience</span>
        </h1>
      </div>

      <!-- Right: Links -->
      <div class="flex items-center gap-6 flex-shrink-0">
        <RouterLink to="/" class="nav-link" :class="{ 'nav-link--active': $route.path === '/' }">Spin and Win</RouterLink>
        <RouterLink to="/washiriki" class="nav-link" :class="{ 'nav-link--active': $route.path === '/washiriki' }">Washiriki</RouterLink>
        <RouterLink to="/admin" class="nav-link" :class="{ 'nav-link--active': $route.path === '/admin' }">Admin</RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav-link {
  font-size: 13px; font-weight: 500;
  color: white;
  white-space: nowrap; text-decoration: none;
  transition: opacity 0.2s;
  opacity: 0.8;
  position: relative;
}
.nav-link:hover { opacity: 1; }
.nav-link--active { opacity: 1; font-weight: 700; }
.nav-link--active::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -6px;
  height: 2px;
  background-color: white;
  border-radius: 2px;
}

.hashtag-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 16px; border-radius: 99px;
  background: transparent; color: white;
  border: 1px solid rgba(255,255,255,0.5);
  font-size: 13px; font-weight: 700;
  white-space: nowrap;
}
.hashtag-icon {
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 900;
}
</style>

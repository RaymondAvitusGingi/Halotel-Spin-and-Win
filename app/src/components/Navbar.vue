<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const scrolled = ref(false);
const handleScroll = () => { scrolled.value = window.scrollY > 10; };
onMounted(() => window.addEventListener('scroll', handleScroll));
onUnmounted(() => window.removeEventListener('scroll', handleScroll));
</script>

<template>
  <nav
    class="navbar fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :style="{
      height: '64px',
      background: scrolled ? 'rgba(8,8,10,0.97)' : '#09090D',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none',
    }"
  >
    <div class="h-full flex items-center justify-between max-w-[1400px] mx-auto px-6 gap-6">

      <!-- Logo -->
      <RouterLink to="/" class="flex-shrink-0">
        <img src="@/assets/Halotel logo-02.svg" alt="Halotel" style="height:30px;width:auto;" />
      </RouterLink>

      <!-- Nav links (hidden on mobile) -->
      <div class="hidden lg:flex items-center gap-1 flex-1 justify-center">
        <a href="/#hero" class="nav-link">Msimu wa Sabasaba</a>
        <RouterLink to="/" class="nav-link" :class="route.path === '/' ? 'nav-link--active' : ''">Spin &amp; Win</RouterLink>
        <a href="/#zawadi" class="nav-link">Zawadi</a>
        <a href="/#jinsi" class="nav-link">Jinsi Inavyofanya Kazi</a>
        <a href="#" class="nav-link">Masharti na Vigezo</a>
      </div>

      <!-- Right actions -->
      <div class="flex items-center gap-3 flex-shrink-0">
        <a
          href="https://twitter.com/search?q=%23HalotelSabasaba"
          target="_blank"
          class="hashtag-btn hidden sm:flex items-center gap-2"
        >
          <span class="hashtag-icon">7</span>
          <span>#HalotelSabasaba</span>
        </a>
        <RouterLink
          to="/admin"
          class="text-xs font-semibold tracking-widest uppercase transition-colors"
          style="color:rgba(255,255,255,0.25);"
          @mouseenter="(e: MouseEvent) => (e.target as HTMLElement).style.color='rgba(255,255,255,0.6)'"
          @mouseleave="(e: MouseEvent) => (e.target as HTMLElement).style.color='rgba(255,255,255,0.25)'"
        >Admin</RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav-link {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.55);
  white-space: nowrap;
  transition: color 0.2s, background 0.2s;
  text-decoration: none;
}
.nav-link:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.05); }
.nav-link--active { color: #F26522 !important; font-weight: 700; }

.hashtag-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 16px; border-radius: 99px;
  background: #F26522;
  color: white; font-size: 13px; font-weight: 700;
  text-decoration: none; white-space: nowrap;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(242,101,34,0.4);
}
.hashtag-btn:hover { background: #E85A18; box-shadow: 0 4px 24px rgba(242,101,34,0.6); }
.hashtag-icon {
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 900;
}
</style>

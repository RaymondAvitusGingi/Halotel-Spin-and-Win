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
      background: scrolled ? 'rgba(8,8,10,0.97)' : '#09090D',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none',
    }"
  >
    <div class="h-full flex items-center justify-between max-w-[1400px] mx-auto px-6 gap-6">

      <!-- Logo → halotel.co.tz -->
      <a href="https://www.halotel.co.tz" target="_blank" rel="noopener" class="flex-shrink-0">
        <img src="@/assets/Halotel logo-02.svg" alt="Halotel" style="height:30px;width:auto;" />
      </a>

      <!-- Nav links -->
      <div class="hidden lg:flex items-center gap-1 flex-1 justify-center">
        <RouterLink to="/" class="nav-link nav-link--active">Spin &amp; Win</RouterLink>
      </div>

      <!-- Right actions -->
      <div class="flex items-center gap-3 flex-shrink-0">
        <a
          href="https://play.google.com/store/apps/details?id=com.halotel.superapp"
          target="_blank"
          rel="noopener"
          class="hashtag-btn hidden sm:flex items-center gap-2"
        >
          <span class="hashtag-icon">↓</span>
          <span>MyHalo</span>
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
  padding: 6px 14px; border-radius: 8px;
  font-size: 13px; font-weight: 500;
  color: rgba(255,255,255,0.55);
  white-space: nowrap; text-decoration: none;
  transition: color 0.2s, background 0.2s;
}
.nav-link:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.05); }
.nav-link--active { color: #F26522 !important; font-weight: 700; }

.hashtag-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 16px; border-radius: 99px;
  background: #F26522; color: white;
  font-size: 13px; font-weight: 700;
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

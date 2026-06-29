<script setup lang="ts">
import { computed } from 'vue';

interface Participant {
  id: string;
  name: string;
  prizeName: string | null;
  isClaimable: boolean | null;
  timestamp?: any;
}

const props = defineProps<{
  participants: Participant[];
}>();

const recentResults = computed(() => {
  return props.participants
    .filter(p => p.isClaimable !== null)
    .slice(0, 5);
});

function formatTime(timestamp: any) {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'sasa hivi';
    if (diffMins < 60) return `${diffMins}m ago`;

    const hours = Math.floor(diffMins / 60);
    if (hours < 24) return `${hours}h ago`;

    return 'kitambo';
  } catch (e) {
    return '';
  }
}
</script>

<template>
  <div v-if="recentResults.length > 0" class="ticker-container">
    <div class="ticker-wrapper">
      <div class="ticker-content">
        <div v-for="(p, idx) in [...recentResults, ...recentResults]" :key="p.id + '-' + idx" class="ticker-item">
          <span class="ticker-dot"></span>
          <span class="ticker-name">{{ p.name }}</span>
          <span class="ticker-action">
            {{ p.isClaimable ? 'ameshinda' : 'amepata' }}
          </span>
          <span :class="['ticker-prize', p.isClaimable ? 'text-yellow-400' : 'text-white/60']">
            {{ p.prizeName || 'Jaribu Tena' }}
          </span>
          <span class="ticker-time">{{ formatTime(p.timestamp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ticker-container {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  height: 36px;
  display: flex;
  align-items: center;
}

.ticker-wrapper {
  width: 100%;
  overflow: hidden;
}

.ticker-content {
  display: flex;
  white-space: nowrap;
  animation: ticker 40s linear infinite;
}

.ticker-content:hover {
  animation-play-state: paused;
}

.ticker-item {
  display: flex;
  align-items: center;
  padding: 0 50px;
  font-size: 13px;
  font-weight: 700;
  color: white;
}

.ticker-dot {
  width: 6px;
  height: 6px;
  background: #F26522;
  border-radius: 50%;
  margin-right: 12px;
  box-shadow: 0 0 8px #F26522;
}

.ticker-name {
  margin-right: 6px;
}

.ticker-action {
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
  margin-right: 6px;
  font-size: 11px;
  text-transform: uppercase;
}

.ticker-prize {
  font-weight: 800;
  margin-right: 8px;
}

.ticker-time {
  font-size: 11px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 4px;
}

@keyframes ticker {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}
</style>

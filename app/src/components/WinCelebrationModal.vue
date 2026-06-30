<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import type { Prize } from '@/hooks/usePrizeStore';

interface Props {
  winnerName: string;
  prize: Prize;
  prizeImg: string | null;
}
const props = defineProps<Props>();
const isWin = computed(() => props.prize.prizeType === 'win' || props.prize.claimable === true);
const emit = defineEmits(['close']);

// Auto-dismiss after 12 s
let timer: ReturnType<typeof setTimeout> | undefined;
const progress = ref(100);
const DURATION = 12000;
let start = 0;
let raf = 0;

function tick(ts: number) {
  if (!start) start = ts;
  const elapsed = ts - start;
  progress.value = Math.max(0, 100 - (elapsed / DURATION) * 100);
  if (elapsed < DURATION) raf = requestAnimationFrame(tick);
  else emit('close');
}

onMounted(() => { raf = requestAnimationFrame(tick); });
onUnmounted(() => { cancelAnimationFrame(raf); clearTimeout(timer); });

// Generate falling confetti particles
const COLORS = ['#FFD700', '#F26522', '#FF8A4C', '#22c55e', '#3b82f6', '#ec4899', '#ffffff', '#a855f7'];
const confetti = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  size: 5 + Math.random() * 8,
  color: COLORS[Math.floor(Math.random() * COLORS.length)],
  delay: Math.random() * 3,
  duration: 2 + Math.random() * 2,
  rotate: Math.random() * 720,
  isDiamond: Math.random() > 0.4,
  drift: (Math.random() - 0.5) * 120,
}));
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">

      <!-- Falling confetti (only for wins) -->
      <div v-if="isWin" class="confetti-stage" aria-hidden="true">
        <div
          v-for="p in confetti" :key="p.id"
          class="confetti-piece"
          :style="{
            left: p.left + '%',
            width:  p.isDiamond ? p.size + 'px' : p.size * 0.6 + 'px',
            height: p.isDiamond ? p.size + 'px' : p.size * 1.6 + 'px',
            background: p.color,
            borderRadius: p.isDiamond ? '2px' : '1px',
            animationDelay: p.delay + 's',
            animationDuration: p.duration + 's',
            '--drift': p.drift + 'px',
            '--rotate': p.rotate + 'deg',
          }"
        />
      </div>

      <!-- Modal card -->
      <div class="card" role="dialog" aria-modal="true">

        <!-- Logo -->
        <div class="logo-row">
          <img src="@/assets/Halote logo white-02.svg" alt="Halotel" class="modal-logo" />
        </div>

        <!-- Close -->
        <button class="close-btn" @click="emit('close')" aria-label="Funga">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <div class="header-row">
          <span class="headline">{{ isWin ? 'HONGERA!' : 'POLE SANA!' }}</span>
          <span class="winner-name">{{ winnerName }}</span>
        </div>

        <!-- Prize card -->
        <div v-if="isWin" class="prize-card">
          <div v-if="prizeImg" class="prize-img-wrap">
            <img :src="prizeImg" :alt="prize.name" class="prize-img" />
          </div>
          <div v-else class="prize-img-wrap" style="font-size:80px;display:flex;align-items:center;justify-content:center;">🎁</div>
          <div class="prize-name">{{ prize.name }}</div>
          <div v-if="prize.swahiliName && prize.swahiliName !== prize.name" class="prize-sw">{{ prize.swahiliName }}</div>
        </div>
        <div v-else class="prize-card no-win-card">
          <div class="emoji-large">😔</div>
          <div class="prize-name">Bila Bahati</div>
          <div class="prize-sw">Jaribu tena wakati mwingine!</div>
        </div>

        <!-- Staff note -->
        <p v-if="isWin" class="staff-note">Staff wa Halotel watakupa zawadi yako hivi karibuni.</p>
        <p v-else class="staff-note" style="opacity: 0.6;">Kila spin ni nafasi yako ya kushinda!</p>

        <!-- Progress bar + dismiss -->
        <div class="footer">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progress + '%' }" />
          </div>
          <button class="dismiss-btn" @click="emit('close')">Funga  ✕</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ──────────────────────────────────────────────── */
.overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.82);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(6px);
  animation: fade-in 0.3s ease;
}
@keyframes fade-in { from { opacity:0 } to { opacity:1 } }

/* ── Falling confetti ──────────────────────────────────────── */
.confetti-stage {
  position: absolute; inset: 0; pointer-events: none; overflow: hidden;
}
.confetti-piece {
  position: absolute; top: -20px;
  animation: fall linear infinite;
  transform-origin: center;
}
@keyframes fall {
  0%   { transform: translateY(0)     translateX(0)        rotate(0deg);   opacity:1; }
  80%  { opacity: 1; }
  100% { transform: translateY(110vh) translateX(var(--drift)) rotate(var(--rotate)); opacity:0; }
}

/* ── Card ──────────────────────────────────────────────────── */
.card {
  position: relative; z-index: 2;
  width: 390px;
  max-width: 95vw;
  min-height: 450px;
  background: linear-gradient(160deg, #F26522, #d94a00);
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 32px;
  padding: 20px 28px;
  text-align: center;
  box-shadow: 0 25px 60px rgba(0,0,0,0.5);
  animation: card-pop 0.45s cubic-bezier(0.34,1.56,0.64,1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.logo-row { margin-bottom: 6px; display: flex; justify-content: center; flex-shrink: 0; }
.modal-logo { height: 32px; width: auto; }
@keyframes card-pop {
  from { transform: scale(0.6); opacity:0; }
  to   { transform: scale(1);   opacity:1; }
}

/* ── Close button ──────────────────────────────────────────── */
.close-btn {
  position: absolute; top: 20px; right: 20px;
  background: transparent; border: none;
  color: rgba(255,255,255,0.7);
  cursor: pointer; transition: color 0.2s;
}
.close-btn:hover { color: white; }

/* ── Trophy burst ──────────────────────────────────────────── */
.trophy-wrap {
  position: relative; width: 24px; height: 24px; margin: 0 auto;
  display: flex; align-items: center; justify-content: center;
}
.trophy-ring {
  position: absolute; border-radius: 50%;
  border: 2px solid rgba(242,101,34,0.4);
  animation: ring-expand 2s ease-out infinite;
}
.trophy-ring--outer { width: 24px; height: 24px; animation-delay: 0s; }
.trophy-ring--inner { width: 16px; height: 16px; animation-delay: 0.4s; }
@keyframes ring-expand {
  0%   { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}
.trophy-emoji {
  font-size: 16px; line-height: 1;
  animation: trophy-bounce 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.2s both;
  display: block;
}
@keyframes trophy-bounce {
  from { transform: scale(0) rotate(-20deg); opacity:0; }
  to   { transform: scale(1) rotate(0deg);  opacity:1; }
}

/* ── Text ──────────────────────────────────────────────────── */
.header-row { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0px; margin-bottom: 6px; flex-shrink: 0; }
.headline {
  font-size: 30px; font-weight: 900; letter-spacing: 1px;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  animation: slide-up 0.4s ease 0.25s both;
  line-height: 1.1;
  text-transform: uppercase;
}
.winner-name {
  font-size: 22px; font-weight: 800; color: #FFD700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.4);
  animation: slide-up 0.4s ease 0.35s both;
  line-height: 1.2;
  text-transform: uppercase;
  margin-top: 2px;
}
.sub-text {
  font-size: 12px; color: white; font-weight: 700; margin-top: 2px;
  text-transform: uppercase; letter-spacing: 1.5px;
  opacity: 0.9;
  animation: slide-up 0.4s ease 0.4s both;
}
@keyframes slide-up {
  from { transform: translateY(12px); opacity:0; }
  to   { transform: translateY(0);    opacity:1; }
}

/* ── Prize card ────────────────────────────────────────────── */
.prize-card {
  margin: 0 auto 6px auto;
  background: rgba(255,255,255,0.08);
  border: 1.5px solid rgba(255,255,255,0.15);
  border-radius: 20px; padding: 12px;
  animation: slide-up 0.4s ease 0.5s both;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.prize-img-wrap {
  width: 150px; height: 150px; margin: 0 auto 8px auto;
  background: white; border-radius: 16px;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  flex-shrink: 0;
}
.prize-img  { width: 85%; height: 85%; object-fit: contain; }
.prize-name { font-size: 20px; font-weight: 900; color: white; line-height: 1.1; text-transform: uppercase; }
.prize-sw   { font-size: 14px; color: #FFD700; margin-top: 3px; font-weight: 700; text-transform: uppercase; }

.no-win-card {
  min-height: 200px;
}
.emoji-large { font-size: 70px; margin-bottom: 12px; }

/* ── Staff note ────────────────────────────────────────────── */
.staff-note {
  font-size: 10px; color: white; line-height: 1.4;
  margin: 2px 0 6px 0; animation: slide-up 0.4s ease 0.6s both;
  font-weight: 600; opacity: 0.9;
}

/* ── Footer ────────────────────────────────────────────────── */
.footer { display: flex; flex-direction: column; gap: 4px; margin-top: 0px; }

.progress-track {
  height: 3px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden;
}
.progress-fill {
  height: 100%; background: linear-gradient(to right, #F26522, #FFD700);
  border-radius: 99px; transition: width 0.1s linear;
}

.dismiss-btn {
  width: 100%;
  padding: 14px; border-radius: 99px;
  background: white; border: none;
  color: #E65C00; font-size: 18px; font-weight: 900;
  cursor: pointer; transition: all 0.2s; letter-spacing: 0.5px;
  text-transform: uppercase;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  flex-shrink: 0;
}
.dismiss-btn:hover { background: rgba(255,255,255,0.1); color: white; }
</style>

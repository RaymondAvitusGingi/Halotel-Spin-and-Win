<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { Prize } from '@/hooks/usePrizeStore';

interface Props {
  winnerName: string;
  prize: Prize;
  prizeImg: string | null;
}
const props = defineProps<Props>();
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

      <!-- Falling confetti -->
      <div class="confetti-stage" aria-hidden="true">
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

        <!-- Close -->
        <button class="close-btn" @click="emit('close')" aria-label="Funga">×</button>

        <!-- Trophy burst -->
        <div class="trophy-wrap">
          <div class="trophy-ring trophy-ring--outer" />
          <div class="trophy-ring trophy-ring--inner" />
          <span class="trophy-emoji">🏆</span>
        </div>

        <!-- Headline -->
        <div class="headline">HONGERA!</div>
        <div class="winner-name">{{ winnerName }}</div>
        <div class="sub-text">Umeshinda zawadi ya kipekee</div>

        <!-- Prize card -->
        <div class="prize-card">
          <div v-if="prizeImg" class="prize-img-wrap">
            <img :src="prizeImg" :alt="prize.name" class="prize-img" />
          </div>
          <div v-else class="prize-img-wrap" style="font-size:36px;display:flex;align-items:center;justify-content:center;">🎁</div>
          <div class="prize-name">{{ prize.name }}</div>
          <div v-if="prize.swahiliName && prize.swahiliName !== prize.name" class="prize-sw">{{ prize.swahiliName }}</div>
        </div>

        <!-- Staff note -->
        <p class="staff-note">Staff wa Halotel watakupa zawadi yako hivi karibuni.</p>

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
  width: min(480px, 92vw);
  background: linear-gradient(160deg, #16161e, #1e1e2e);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 28px;
  padding: 36px 28px 24px;
  text-align: center;
  box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(242,101,34,0.15);
  animation: card-pop 0.45s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes card-pop {
  from { transform: scale(0.6); opacity:0; }
  to   { transform: scale(1);   opacity:1; }
}

/* ── Close button ──────────────────────────────────────────── */
.close-btn {
  position: absolute; top: 16px; right: 16px;
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.5); font-size: 18px; line-height: 1;
  cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.close-btn:hover { background: rgba(239,68,68,0.2); color: #f87171; border-color: rgba(239,68,68,0.3); }

/* ── Trophy burst ──────────────────────────────────────────── */
.trophy-wrap {
  position: relative; width: 90px; height: 90px; margin: 0 auto 16px;
  display: flex; align-items: center; justify-content: center;
}
.trophy-ring {
  position: absolute; border-radius: 50%;
  border: 2px solid rgba(242,101,34,0.4);
  animation: ring-expand 2s ease-out infinite;
}
.trophy-ring--outer { width: 90px; height: 90px; animation-delay: 0s; }
.trophy-ring--inner { width: 65px; height: 65px; animation-delay: 0.4s; }
@keyframes ring-expand {
  0%   { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}
.trophy-emoji {
  font-size: 48px; line-height: 1;
  animation: trophy-bounce 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.2s both;
  display: block;
}
@keyframes trophy-bounce {
  from { transform: scale(0) rotate(-20deg); opacity:0; }
  to   { transform: scale(1) rotate(0deg);  opacity:1; }
}

/* ── Text ──────────────────────────────────────────────────── */
.headline {
  font-size: 42px; font-weight: 900; letter-spacing: -1px;
  background: linear-gradient(135deg, #FFD700, #F26522);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: slide-up 0.4s ease 0.25s both;
  line-height: 1;
}
.winner-name {
  font-size: 22px; font-weight: 800; color: white; margin-top: 6px;
  animation: slide-up 0.4s ease 0.35s both;
}
.sub-text {
  font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 500; margin-top: 4px;
  text-transform: uppercase; letter-spacing: 1.5px;
  animation: slide-up 0.4s ease 0.4s both;
}
@keyframes slide-up {
  from { transform: translateY(12px); opacity:0; }
  to   { transform: translateY(0);    opacity:1; }
}

/* ── Prize card ────────────────────────────────────────────── */
.prize-card {
  margin: 20px 0 14px;
  background: linear-gradient(135deg, rgba(242,101,34,0.1), rgba(255,215,0,0.06));
  border: 1.5px solid rgba(242,101,34,0.25);
  border-radius: 18px; padding: 18px 20px;
  animation: slide-up 0.4s ease 0.5s both;
}
.prize-img-wrap {
  width: 80px; height: 80px; margin: 0 auto 12px;
  background: rgba(255,255,255,0.05); border-radius: 14px;
  overflow: hidden;
}
.prize-img  { width: 100%; height: 100%; object-fit: contain; }
.prize-name { font-size: 20px; font-weight: 900; color: white; line-height: 1.2; }
.prize-sw   { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 3px; }

/* ── Staff note ────────────────────────────────────────────── */
.staff-note {
  font-size: 12px; color: rgba(255,255,255,0.3); line-height: 1.6;
  margin: 0 0 20px; animation: slide-up 0.4s ease 0.6s both;
}

/* ── Footer ────────────────────────────────────────────────── */
.footer { display: flex; flex-direction: column; gap: 10px; }

.progress-track {
  height: 3px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden;
}
.progress-fill {
  height: 100%; background: linear-gradient(to right, #F26522, #FFD700);
  border-radius: 99px; transition: width 0.1s linear;
}

.dismiss-btn {
  padding: 12px; border-radius: 12px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; letter-spacing: 0.3px;
}
.dismiss-btn:hover { background: rgba(255,255,255,0.1); color: white; }
</style>

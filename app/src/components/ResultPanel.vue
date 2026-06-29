<script setup lang="ts">
import { ref, watch } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import { playWin, playNoWin } from '@/utils/audio';
import type { Prize } from '@/hooks/usePrizeStore';
import type { SpinPhase } from '@/hooks/useWheelState';
import braceletImg from '@/assets/prizes/bracelet.png';
import capImg from '@/assets/prizes/cap.png';
import penKeyholderImg from '@/assets/prizes/pen-keyholder.png';
import voucher500Img from '@/assets/prizes/voucher-500.png';
import voucher2000Img from '@/assets/prizes/voucher-2000.png';
import voucher5000Img from '@/assets/prizes/voucher-5000.png';

interface Props { winResult: Prize | null; phase: SpinPhase }
const props = defineProps<Props>();
const emit = defineEmits(['spinAgain']);

const displayResult = ref<Prize | null>(null);
const isAnimating   = ref(false);

const prizeImages: Record<string, string> = {
  bracelets: braceletImg, cap: capImg, pen_keyholder: penKeyholderImg,
  pen: penKeyholderImg, key_holder: penKeyholderImg,
  'pen-keyholder': penKeyholderImg, voucher_500: voucher500Img,
  voucher_2000: voucher2000Img, voucher_5000: voucher5000Img,
};

function getPrizeImg(prize: Prize): string | null {
  if (prize.thumbnail) return prize.thumbnail;
  for (const [k, v] of Object.entries(prizeImages)) {
    if (prize.id.includes(k) || prize.name.toLowerCase().includes(k.replace('_', ' '))) return v;
  }
  return null;
}

watch([() => props.winResult, () => props.phase], ([winResult, phase]) => {
  if (phase === 'idle') {
    displayResult.value = null;
  } else if (phase === 'stopped' && winResult) {
    isAnimating.value = true;
    setTimeout(() => {
      displayResult.value = winResult;
      isAnimating.value   = false;
      winResult.claimable ? playWin() : playNoWin();
    }, 150);
  }
}, { immediate: true });
</script>

<template>
  <!-- SPINNING -->
  <div v-if="phase === 'spinning'" class="result-card">
    <div class="pulse-ring">
      <Loader2 class="w-8 h-8" style="color:#F26522;animation:spin-anim 1s linear infinite;" />
    </div>
    <h3 class="result-title" style="color:#333;">Gurudemu Linazunguka...</h3>
    <p class="result-sub">Subiri kidogo — tunakupatia zawadi yako</p>
  </div>

  <!-- IDLE -->
  <div v-else-if="!displayResult" class="result-card result-card--idle">
    <div class="idle-icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F26522" stroke-width="1.5" stroke-linecap="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/><polyline points="21 3 21 9 15 9"/>
      </svg>
    </div>
    <h3 class="result-title" style="color:#333;">Tayari Kuanza!</h3>
    <p class="result-sub">Bonyeza SPIN, jaza fomu yako — kisha anza!</p>
    <div class="idle-hint">🎯 Zawadi zinakusubiri</div>
  </div>

  <!-- NON-CLAIMABLE -->
  <div v-else-if="displayResult && !displayResult.claimable"
    class="result-card"
    :style="{ opacity: isAnimating ? 0 : 1, transition: 'opacity 0.3s' }"
  >
    <div class="result-emoji">{{ displayResult.id === 'jaribu' ? '🔄' : '🙏' }}</div>
    <h3 class="result-title" style="color:#333;">{{ displayResult.id === 'jaribu' ? 'Jaribu Tena!' : 'Asante!' }}</h3>
    <p class="result-sub">
      {{ displayResult.id === 'jaribu' ? 'Bahati mara nyingine — jaribu tena!' : 'Asante kwa kushiriki Spin & Win ya Halotel!' }}
    </p>
    <div class="non-win-badge">{{ displayResult.swahiliName }}</div>
    <div class="btn-row">
      <button @click="emit('spinAgain')" class="btn-outline">🔄 SPIN TENA</button>
      <button class="btn-outline">🏠 RUDI NYUMBANI</button>
    </div>
  </div>

  <!-- WIN RESULT — White Card like reference -->
  <div v-else-if="displayResult && displayResult.claimable"
    class="result-card result-card--win"
    :style="{ opacity: isAnimating ? 0 : 1, transition: 'opacity 0.4s' }"
  >
    <!-- Green checkmark -->
    <div class="check-circle">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>

    <h3 class="win-title">Hongera!</h3>
    <p class="win-subtitle">Umeshinda</p>

    <!-- Prize display card -->
    <div class="prize-card">
      <div v-if="getPrizeImg(displayResult)" class="prize-img-wrap">
        <img :src="getPrizeImg(displayResult)!" :alt="displayResult.name" class="prize-img" />
      </div>
      <div v-else class="prize-name-big">
        {{ displayResult.amount ? `${displayResult.amount}` : displayResult.name }}
      </div>
      <div v-if="displayResult.amount" class="prize-amount">
        {{ displayResult.amount }}
      </div>
      <div class="prize-brand">halotel</div>
    </div>

    <p class="win-desc">
      Zawadi yako imetumwa!<br/>Tafadhali angalia SMS yako kwa maelezo zaidi.
    </p>

    <div class="btn-row">
      <button @click="emit('spinAgain')" class="btn-outline">🔄 SPIN TENA</button>
      <button class="btn-outline">🏠 RUDI NYUMBANI</button>
    </div>
  </div>
</template>

<style scoped>
.result-card {
  background: white;
  border-radius: 16px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 280px;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  transition: all 0.3s;
}

.result-card--idle { gap: 4px; }
.result-card--win { }

.result-title {
  font-size: 1.3rem; font-weight: 900; margin: 0 0 4px; letter-spacing: -0.3px;
}
.result-sub {
  color: #888; font-size: 0.72rem; font-weight: 500; margin: 0 0 8px; line-height: 1.5;
}

/* Spinning pulse */
.pulse-ring {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(242,101,34,0.1);
  display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
  animation: pulse-ring 2s ease-out infinite;
}
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0   rgba(242,101,34,0.4); }
  70%  { box-shadow: 0 0 0 20px rgba(242,101,34,0); }
  100% { box-shadow: 0 0 0 0   rgba(242,101,34,0); }
}

/* Idle icon */
.idle-icon {
  width: 60px; height: 60px; border-radius: 50%;
  background: rgba(242,101,34,0.08); border: 1.5px dashed rgba(242,101,34,0.25);
  display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
  animation: idle-spin 12s linear infinite;
}
@keyframes idle-spin { to { transform: rotate(360deg); } }
.idle-hint {
  margin-top: 10px; display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 99px;
  background: rgba(242,101,34,0.06); border: 1px solid rgba(242,101,34,0.12);
  color: #888; font-size: 11px; font-weight: 600;
}

/* Non-win badge */
.result-emoji { font-size: 36px; margin-bottom: 8px; }
.non-win-badge {
  padding: 8px 16px; border-radius: 10px;
  background: #f8f8f8; border: 1px solid #eee;
  color: #666; font-weight: 800; font-size: 12px; letter-spacing: 0.5px;
  margin-bottom: 12px;
}

/* Win card styling */
.check-circle {
  width: 52px; height: 52px; border-radius: 50%;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 10px;
  box-shadow: 0 6px 20px rgba(34,197,94,0.3);
}
.win-title {
  color: #333; font-size: 1.6rem; font-weight: 900; margin: 0 0 2px; letter-spacing: -0.5px;
}
.win-subtitle {
  color: #666; font-size: 12px; font-weight: 700; margin: 0 0 12px;
  letter-spacing: 1px; text-transform: uppercase;
}
.prize-card {
  width: 100%; border-radius: 12px; overflow: hidden;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 2px solid #22c55e;
  padding: 14px; margin-bottom: 10px;
  display: flex; flex-direction: column; align-items: center;
}
.prize-img-wrap {
  width: 70px; height: 70px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 6px; overflow: hidden;
}
.prize-img { width: 100%; height: 100%; object-fit: contain; }
.prize-name-big { font-size: 18px; font-weight: 900; color: #22c55e; }
.prize-amount { font-size: 28px; font-weight: 900; color: #22c55e; line-height: 1; }
.prize-brand { font-size: 10px; font-weight: 700; color: #999; letter-spacing: 1px; margin-top: 2px; }

.win-desc {
  color: #888; font-size: 10px; line-height: 1.6; text-align: center; margin: 0 0 12px;
}

/* Buttons */
.btn-row {
  display: flex; gap: 8px; width: 100%; margin-top: 4px;
}
.btn-outline {
  flex: 1; padding: 8px 10px; border-radius: 10px;
  background: white; border: 1.5px solid #e0e0e0;
  color: #555; font-size: 10px; font-weight: 700; cursor: pointer;
  transition: all 0.2s; white-space: nowrap;
}
.btn-outline:hover {
  border-color: #F26522; color: #F26522; background: #fff5f0;
}

@keyframes spin-anim { to { transform: rotate(360deg); } }
</style>

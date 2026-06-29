<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { RefreshCw, Loader2 } from 'lucide-vue-next';
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

const cardStyle = computed(() => {
  if (!displayResult.value) return {};
  if (!displayResult.value.claimable) {
    const isRetry = displayResult.value.id === 'jaribu';
    return isRetry
      ? { accent: '#DC3545', bg: 'rgba(220,53,69,0.12)', border: 'rgba(220,53,69,0.25)' }
      : { accent: '#6C757D', bg: 'rgba(108,117,125,0.12)', border: 'rgba(108,117,125,0.25)' };
  }
  return { accent: '#F26522', bg: 'rgba(40,167,69,0.12)', border: 'rgba(40,167,69,0.3)' };
});
</script>

<template>
  <!-- SPINNING -->
  <div v-if="phase === 'spinning'" class="result-card result-card--dark">
    <div class="pulse-ring">
      <Loader2 class="w-10 h-10" style="color:#F26522;animation:spin-anim 1s linear infinite;" />
    </div>
    <h3 class="result-title">Gurudemu Linazunguka...</h3>
    <p class="result-sub">Subiri kidogo — tunakupatia zawadi yako</p>
  </div>

  <!-- IDLE -->
  <div v-else-if="!displayResult" class="result-card result-card--dark result-card--idle">
    <div class="idle-orbit">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#F26522" stroke-width="1.5" stroke-linecap="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/><polyline points="21 3 21 9 15 9"/>
      </svg>
    </div>
    <h3 class="result-title">Tayari Kuanza!</h3>
    <p class="result-sub">Bonyeza SPIN, jaza fomu yako — kisha anza!</p>
    <div class="idle-hint"><span>🎯</span><span>Zawadi zinakusubiri</span></div>
  </div>

  <!-- NON-CLAIMABLE result -->
  <div v-else-if="displayResult && !displayResult.claimable"
    class="result-card result-card--dark"
    :style="{ opacity: isAnimating ? 0 : 1, transition: 'opacity 0.3s' }"
  >
    <div class="result-icon-wrap" :style="{ background: cardStyle.bg, border: `1px solid ${cardStyle.border}` }">
      <span style="font-size:36px">{{ displayResult.id === 'jaribu' ? '🔄' : '🙏' }}</span>
    </div>
    <h3 class="result-title">{{ displayResult.id === 'jaribu' ? 'Jaribu Tena!' : 'Asante!' }}</h3>
    <p class="result-sub" style="margin-bottom:20px">
      {{ displayResult.id === 'jaribu' ? 'Bahati mara nyingine — jaribu tena!' : 'Asante kwa kushiriki Spin & Win ya Halotel!' }}
    </p>
    <div class="non-win-badge" :style="{ background: cardStyle.bg, borderColor: cardStyle.border, color: cardStyle.accent }">
      {{ displayResult.swahiliName }}
    </div>
    <button @click="emit('spinAgain')" class="spin-again-btn" style="margin-top:24px">
      <RefreshCw class="w-4 h-4" /><span>MCHEZO UJAO</span>
    </button>
  </div>

  <!-- WIN result -->
  <div v-else-if="displayResult && displayResult.claimable"
    class="result-card result-card--dark result-card--win"
    :style="{ opacity: isAnimating ? 0 : 1, transition: 'opacity 0.4s' }"
  >
    <!-- Green checkmark -->
    <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;margin-bottom:14px;box-shadow:0 8px 28px rgba(34,197,94,0.35);">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>

    <h3 style="color:white;font-size:1.8rem;font-weight:900;margin:0 0 2px;letter-spacing:-0.5px;">Hongera!</h3>
    <p style="color:rgba(255,255,255,0.45);font-size:12px;font-weight:700;margin:0 0 16px;letter-spacing:1px;text-transform:uppercase;">Umeshinda</p>

    <!-- Prize image -->
    <div v-if="getPrizeImg(displayResult)" class="win-img-wrap">
      <img :src="getPrizeImg(displayResult)!" :alt="displayResult.name" class="win-img" />
    </div>

    <!-- Prize name card -->
    <div style="
      width:100%;border-radius:14px;overflow:hidden;margin-bottom:14px;
      background:linear-gradient(135deg,rgba(34,197,94,0.08),rgba(34,197,94,0.03));
      border:1.5px solid rgba(34,197,94,0.25);
    ">
      <div style="padding:16px 18px;">
        <div style="font-size:10px;font-weight:800;letter-spacing:3px;color:rgba(34,197,94,0.7);text-transform:uppercase;margin-bottom:4px;">ZAWADI YAKO</div>
        <div style="font-size:20px;font-weight:900;color:white;line-height:1.1;">
          {{ displayResult.amount ? `TZS ${displayResult.amount}` : displayResult.name }}
        </div>
      </div>
    </div>

    <p style="color:rgba(255,255,255,0.35);font-size:11px;line-height:1.7;text-align:center;margin:0 0 18px;">
      Zawadi yako imethibitishwa!<br/>Staff wa Halotel watakupa zawadi yako hivi karibuni.
    </p>

    <button @click="emit('spinAgain')" class="spin-again-btn">
      <RefreshCw class="w-4 h-4" /><span>MCHEZO UJAO</span>
    </button>
  </div>
</template>

<style scoped>
.result-card {
  border-radius: 20px; padding: 24px 16px;
  display: flex; flex-direction: column; align-items: center;
  text-align: center; min-height: 320px; justify-content: center; transition: all 0.3s;
}
.result-card--dark {
  background: #14141A; border: 1px solid rgba(255,255,255,0.06);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
.result-card--win { border-color: rgba(34,197,94,0.2); }

.result-title { color:white; font-size:1.25rem; font-weight:900; margin:0 0 4px; letter-spacing:-0.3px; }
.result-sub   { color:rgba(255,255,255,0.5); font-size:0.7rem; font-weight:600; margin:0 0 8px; line-height:1.5; }

.pulse-ring {
  width:80px; height:80px; border-radius:50%;
  background:rgba(242,101,34,0.12);
  display:flex; align-items:center; justify-content:center; margin-bottom:20px;
  animation:pulse-ring 2s ease-out infinite;
}
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0   rgba(242,101,34,0.4); }
  70%  { box-shadow: 0 0 0 20px rgba(242,101,34,0); }
  100% { box-shadow: 0 0 0 0   rgba(242,101,34,0); }
}

.result-card--idle { gap:4px; }
.idle-orbit {
  width:72px; height:72px; border-radius:50%;
  background:rgba(242,101,34,0.1); border:1.5px dashed rgba(242,101,34,0.3);
  display:flex; align-items:center; justify-content:center; margin-bottom:20px;
  animation:idle-spin 12s linear infinite;
}
@keyframes idle-spin { to { transform: rotate(360deg); } }
.idle-hint {
  margin-top:16px; display:flex; align-items:center; gap:8px;
  padding:8px 16px; border-radius:99px;
  background:rgba(242,101,34,0.08); border:1px solid rgba(242,101,34,0.15);
  color:rgba(255,255,255,0.5); font-size:12px; font-weight:600;
}

.result-icon-wrap {
  width:80px; height:80px; border-radius:20px;
  display:flex; align-items:center; justify-content:center; margin-bottom:20px;
}
.non-win-badge {
  padding:10px 20px; border-radius:12px;
  border:1px solid; font-weight:800; font-size:14px; letter-spacing:1px;
}

.win-img-wrap {
  width:90px; height:90px; border-radius:18px;
  background:rgba(255,255,255,0.05);
  display:flex; align-items:center; justify-content:center;
  margin-bottom:14px; overflow:hidden; border:1px solid rgba(255,255,255,0.08);
}
.win-img { width:100%; height:100%; object-fit:contain; }

.spin-again-btn {
  display:flex; align-items:center; gap:8px;
  padding:11px 24px; border-radius:99px;
  background:linear-gradient(145deg,#F26522,#E85A18);
  color:white; font-weight:800; font-size:12px; letter-spacing:0.5px;
  border:none; cursor:pointer; box-shadow:0 4px 20px rgba(242,101,34,0.4);
  transition:all 0.2s;
}
.spin-again-btn:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(242,101,34,0.5); }

@keyframes spin-anim { to { transform: rotate(360deg); } }
</style>

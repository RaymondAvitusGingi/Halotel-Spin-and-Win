<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { RefreshCw, Home, Check, Loader2 } from 'lucide-vue-next';
import type { Prize } from '@/hooks/usePrizeStore';
import type { SpinPhase } from '@/hooks/useWheelState';
import braceletImg from '@/assets/prizes/bracelet.png';
import capImg from '@/assets/prizes/cap.png';
import penKeyholderImg from '@/assets/prizes/pen-keyholder.png';
import voucher500Img from '@/assets/prizes/voucher-500.png';
import voucher2000Img from '@/assets/prizes/voucher-2000.png';
import voucher5000Img from '@/assets/prizes/voucher-5000.png';

interface Props {
  winResult: Prize | null;
  phase: SpinPhase;
}

const props = defineProps<Props>();
const emit = defineEmits(['spinAgain']);

const displayResult = ref<Prize | null>(null);
const isAnimating = ref(false);

const prizeImages: Record<string, string> = {
  'bracelets': braceletImg, 'cap': capImg, 'pen_keyholder': penKeyholderImg,
  'pen-keyholder': penKeyholderImg, 'voucher_500': voucher500Img,
  'voucher_2000': voucher2000Img, 'voucher_5000': voucher5000Img,
};

function getPrizeImg(prize: Prize): string | null {
  for (const [k, v] of Object.entries(prizeImages)) {
    if (prize.id.includes(k) || prize.name.toLowerCase().includes(k.replace('_', ' '))) return v;
    if (prize.swahiliName.toLowerCase().includes(k.replace('_', ' '))) return v;
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
      isAnimating.value = false;
    }, 150);
  }
}, { immediate: true });

const isPrize = computed(() => displayResult.value?.type === 'prize');
const isThanks = computed(() => displayResult.value?.type === 'thanks');
const isRetry = computed(() => displayResult.value?.type === 'retry');

const cardColors = computed(() => {
  if (isThanks.value) return { bg: 'rgba(108,117,125,0.15)', border: 'rgba(108,117,125,0.3)', text: '#6C757D', accent: '#6C757D' };
  if (isRetry.value) return { bg: 'rgba(220,53,69,0.15)', border: 'rgba(220,53,69,0.3)', text: '#DC3545', accent: '#DC3545' };
  return { bg: 'rgba(40,167,69,0.15)', border: 'rgba(40,167,69,0.3)', text: '#28A745', accent: '#F26522' };
});
</script>

<template>
  <!-- SPINNING STATE -->
  <div v-if="phase === 'spinning'"
    class="rounded-2xl p-6 flex flex-col items-center text-center min-h-[420px] justify-center transition-all duration-300"
    :style="{ backgroundColor: '#14141A', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }"
  >
    <div class="w-20 h-20 rounded-full flex items-center justify-center mb-5" style="background: rgba(242,101,34,0.15);">
      <Loader2 class="w-10 h-10 text-[#F26522]" style="animation: spin-anim 1s linear infinite;" />
    </div>
    <h3 class="text-white font-extrabold text-2xl mb-2">Gurudemu Linazunguka...</h3>
    <p class="text-white/50 font-semibold text-sm">Subiri kidogo tunakupatia zawadi yako</p>
  </div>

  <!-- IDLE STATE -->
  <div v-else-if="!displayResult"
    class="rounded-2xl p-6 flex flex-col items-center text-center min-h-[420px] justify-center"
    :style="{ backgroundColor: '#14141A', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }"
  >
    <div class="w-16 h-16 rounded-full flex items-center justify-center mb-5" style="background: rgba(242,101,34,0.15);">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F26522" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
    </div>
    <h3 class="text-white font-extrabold text-2xl mb-2">Tayari Kuanza!</h3>
    <p class="text-white/50 font-semibold text-sm mb-4">Bonyeza SPIN katikati ya gurudemu</p>
    <div class="w-24 h-24 rounded-full flex items-center justify-center" style="background: rgba(242,101,34,0.08); border: 2px dashed rgba(242,101,34,0.2);">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F26522" stroke-width="1.5" stroke-linecap="round">
        <path d="M12 2a10 10 0 1 0 10 10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    </div>
  </div>

  <!-- RESULT STATE -->
  <div v-else
    class="rounded-2xl p-6 flex flex-col items-center text-center min-h-[420px] justify-center transition-opacity duration-300"
    :style="{
      backgroundColor: '#14141A', border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', opacity: isAnimating ? 0.3 : 1,
    }"
  >
    <!-- Prize Image -->
    <div v-if="getPrizeImg(displayResult)" class="w-28 h-28 rounded-2xl mb-5 p-3 flex items-center justify-center overflow-hidden"
      :style="{ backgroundColor: cardColors.bg, border: `1px solid ${cardColors.border}` }">
      <img :src="getPrizeImg(displayResult)!" :alt="displayResult.name" class="w-full h-full object-contain" />
    </div>
    <div v-else class="w-16 h-16 rounded-full flex items-center justify-center mb-5" :style="{ backgroundColor: cardColors.bg }">
      <Check class="w-8 h-8" :style="{ color: cardColors.text }" stroke-width="3" />
    </div>

    <h3 class="text-white font-extrabold text-3xl mb-1">
      {{ isThanks ? 'Asante!' : isRetry ? 'Jaribu Tena!' : 'Hongera!' }}
    </h3>
    <p class="text-white/70 font-semibold text-lg mb-5">
      {{ isThanks ? 'Kwa Kushiriki' : isRetry ? 'Bahati Mwisho' : 'Umeshinda' }}
    </p>

    <div class="w-full rounded-xl p-5 mb-5" :style="{ backgroundColor: cardColors.bg, border: `1px solid ${cardColors.border}` }">
      <div class="text-xs font-bold tracking-[2px] uppercase mb-1" :style="{ color: cardColors.text }">
        {{ isPrize ? 'VOUCHER' : isThanks ? 'ZAWADI' : 'JARIBU' }}
      </div>
      <div class="font-black text-3xl" :style="{ color: cardColors.text }">
        {{ displayResult.amount || displayResult.name }}
      </div>
    </div>

    <p class="text-white font-semibold text-sm mb-1">
      {{ isThanks ? 'Asante kwa kushiriki!' : isRetry ? 'Usikate tamaa, jaribu tena!' : 'Zawadi yako imetumwa!' }}
    </p>
    <p class="text-white/50 text-xs mb-6">
      {{ isThanks ? 'Tunakushukuru. Endelea kufuatilia.' : isRetry ? 'Bonyeza SPIN TENA kujaribu bahati yako.' : 'Tafadhali angalia SMS yako kwa maelezo zaidi.' }}
    </p>

    <div class="flex gap-3">
      <button @click="emit('spinAgain')"
        class="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-white text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        :style="{ background: 'linear-gradient(145deg, #F26522, #E85A18)', boxShadow: '0 4px 16px rgba(242,101,34,0.35)' }">
        <RefreshCw class="w-4 h-4" />
        <span>SPIN TENA</span>
      </button>
      <button class="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-white/70 text-sm transition-all"
        :style="{ background: 'transparent', border: '2px solid rgba(255,255,255,0.15)' }">
        <Home class="w-4 h-4" />
        <span>RUDI</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin-anim {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  addDoc, updateDoc, doc, collection,
  serverTimestamp, query, orderBy, where, onSnapshot, Timestamp,
} from 'firebase/firestore';
import { Loader2 } from 'lucide-vue-next';
import { db } from '@/firebase';
import PrizeWheel from '@/components/PrizeWheel.vue';
import ConfettiField from '@/components/ConfettiField.vue';
import WinCelebrationModal from '@/components/WinCelebrationModal.vue';
import RecentWinnersTicker from '@/components/RecentWinnersTicker.vue';
import { usePrizeStore } from '@/hooks/usePrizeStore';
import type { Prize } from '@/hooks/usePrizeStore';
import type { SpinPhase } from '@/hooks/useWheelState';
import braceletImg from '@/assets/prizes/bracelet.png';
import capImg from '@/assets/prizes/cap.png';
import penKeyholderImg from '@/assets/prizes/pen-keyholder.png';
import voucher500Img from '@/assets/prizes/voucher-500.png';
import voucher2000Img from '@/assets/prizes/voucher-2000.png';
import voucher5000Img from '@/assets/prizes/voucher-5000.png';

interface Props {
  rotation: number;
  phase: SpinPhase;
  winResult: Prize | null;
  flashingSegment: number | null;
}
const props = defineProps<Props>();
const emit = defineEmits(['spin', 'spinAgain']);

const { prizes } = usePrizeStore();

const prizeImgs: Record<string, string> = {
  bracelets: braceletImg, cap: capImg, pen_keyholder: penKeyholderImg,
  pen: penKeyholderImg, key_holder: penKeyholderImg,
  voucher_500: voucher500Img, voucher_2000: voucher2000Img, voucher_5000: voucher5000Img,
};

// ── Participant types ────────────────────────────────────────
type PStatus = 'pending' | 'spinning' | 'won' | 'no_win';
interface Participant {
  id: string;         // Firestore doc ID
  name: string;
  phone: string;
  status: PStatus;
  prizeId: string | null;
  prizeName: string | null;
  isClaimable: boolean | null;
  hasRetried: boolean;
  timestamp?: any;
}

const participants  = ref<Participant[]>([]);
const selectedId    = ref<string | null>(null);
const showRegistrationModal = ref(false);
const addSubmitting = ref(false);
const addError      = ref('');
const addForm       = reactive({ name: '', phone: '+255 ' });

const selectedP = computed(() => participants.value.find(p => p.id === selectedId.value) ?? null);

// ── Live Firestore queue ─────────────────────────────────────
// Load today's participants from Firestore so the queue survives
// page refreshes, HMR reloads, and browser restarts.
let unsub: (() => void) | null = null;

onMounted(() => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, 'spins'),
    where('timestamp', '>=', Timestamp.fromDate(todayStart)),
    orderBy('timestamp', 'desc'),
  );

  unsub = onSnapshot(q, (snap) => {
    // Build incoming list, mapping Firestore fields to local status.
    // Preserve 'spinning' status for any participant currently mid-animation
    // so the snapshot doesn't interrupt the active spin.
    const incoming: Participant[] = snap.docs.map(d => {
      const data = d.data() as any;
      const existing = participants.value.find(p => p.id === d.id);

      // If this participant is currently spinning locally, keep that status
      if (existing?.status === 'spinning') return existing;

      let status: PStatus;
      if (data.isClaimable === true)       status = 'won';
      else if (data.isClaimable === false) status = 'no_win';
      else                                 status = 'pending';

      return {
        id:          d.id,
        name:        data.name ?? '',
        phone:       data.phone ?? '',
        status,
        prizeId:     data.prizeId   ?? null,
        prizeName:   data.prizeName ?? null,
        isClaimable: data.isClaimable ?? null,
        hasRetried:  existing?.hasRetried ?? false,
        timestamp:   data.timestamp,
      };
    });

    participants.value = incoming;

    // Auto-select the first pending participant if current selection is gone
    const selectionValid = incoming.find(p => p.id === selectedId.value && p.status === 'pending');
    if (!selectionValid) {
      selectedId.value = incoming.find(p => p.status === 'pending')?.id ?? null;
    }
  });
});

onUnmounted(() => unsub?.());

// ── Add participant & Auto Spin ─────────────────────────────
async function addParticipant() {
  addError.value = '';
  const name  = addForm.name.trim();
  const phone = addForm.phone.trim();
  if (!name)                               { addError.value = 'Ingiza jina'; return; }
  if (phone.replace(/\D/g, '').length < 9) { addError.value = 'Namba ya simu'; return; }

  addSubmitting.value = true;
  try {
    const docRef = await addDoc(collection(db, 'spins'), {
      name, phone,
      timestamp: serverTimestamp(),
      prizeId: null, prizeName: null, isClaimable: null,
    });

    selectedId.value = docRef.id;
    showRegistrationModal.value = false;
    
    // reset form
    addForm.name = ''; addForm.phone = '+255 ';

    // Wait for the snapshot to pick it up so we can spin optimistically
    setTimeout(() => {
      const p = participants.value.find(q => q.id === docRef.id);
      if (p) p.status = 'spinning';
      emit('spin');
    }, 100);

  } catch {
    addError.value = 'Hitilafu ya mtandao. Jaribu tena.';
  }
  addSubmitting.value = false;
}

// ── Participant selection (removed since we have a popup flow) ────────────────────────────────────


// ── Spin trigger ─────────────────────────────────────────────
function onWheelSpin() {
  if (props.phase === 'spinning') return;
  showRegistrationModal.value = true;
}

// ── Win celebration modal & retry toast ─────────────────────
const celebration = ref<{ winnerName: string; prize: Prize; prizeImg: string | null } | null>(null);
const retryToast  = ref<string | null>(null); // winner name during retry

function dismissCelebration() {
  celebration.value = null;
  const next = participants.value.find(q => q.status === 'pending');
  selectedId.value = next?.id ?? null;
  emit('spinAgain');
}

// ── Capture result ───────────────────────────────────────────
watch(() => props.winResult, async (prize) => {
  if (!prize) return;
  const p = selectedP.value;
  if (!p || p.status !== 'spinning') return;

  const pType = prize.prizeType ?? (prize.claimable ? 'win' : 'thanks');

  if (pType === 'retry' && !p.hasRetried) {
    // Give them one more spin — don't record a result yet
    p.hasRetried = true;
    p.status     = 'pending';
    retryToast.value = p.name;
    setTimeout(() => { retryToast.value = null; }, 3000);
    emit('spinAgain');
    return;
  }

  p.status      = pType === 'win' ? 'won' : 'no_win';
  p.prizeId     = prize.id;
  p.prizeName   = prize.name;
  p.isClaimable = pType === 'win';

  try {
    await updateDoc(doc(db, 'spins', p.id), {
      prizeId: prize.id, prizeName: prize.name, isClaimable: pType === 'win',
    });
  } catch { /* silent */ }

  if (pType === 'win' || pType === 'thanks') {
    // Show celebration modal for both wins and losses
    celebration.value = {
      winnerName: p.name,
      prize,
      prizeImg: prizeImgs[prize.id] ?? null,
    };
  } else {
    // exhausted retry — auto-advance after 2.5 s
    setTimeout(() => {
      const next = participants.value.find(q => q.status === 'pending');
      selectedId.value = next?.id ?? null;
      emit('spinAgain');
    }, 2500);
  }
});
</script>

<template>
  <!-- Retry toast -->
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="retryToast" style="
        position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:9998;
        background:linear-gradient(135deg,#DC3545,#b02a37);
        color:white;padding:14px 28px;border-radius:99px;
        font-size:15px;font-weight:800;letter-spacing:0.3px;
        box-shadow:0 8px 32px rgba(220,53,69,0.5);
        display:flex;align-items:center;gap:10px;white-space:nowrap;
      ">
        🔄 <span>{{ retryToast }} — Jaribu Tena! Spin moja zaidi.</span>
      </div>
    </Transition>
  </Teleport>

  <!-- Win celebration modal -->
  <WinCelebrationModal
    v-if="celebration"
    :winnerName="celebration.winnerName"
    :prize="celebration.prize"
    :prizeImg="celebration.prizeImg"
    @close="dismissCelebration"
  />

  <!-- Registration Modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showRegistrationModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div class="bg-gradient-to-b from-[#ff8c1a] to-[#e65c00] w-full max-w-sm rounded-[24px] p-1 shadow-2xl relative overflow-hidden" style="border: 2px solid rgba(255,255,255,0.2);">
          <!-- Inner card — Orange theme -->
          <div class="rounded-[20px] p-6 relative z-10 flex flex-col items-center" style="background: linear-gradient(160deg, #F26522, #d94a00);">
            
            <button @click="showRegistrationModal = false" class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <img src="@/assets/Halote logo white-02.svg" alt="Halotel" class="h-8 mb-4" />
            
            <h2 class="text-white font-black text-xl mb-6 text-center" style="letter-spacing:1px; text-transform:uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              Ingiza taarifa <br/>
              <span style="color: #FFD700; text-shadow: 0 1px 3px rgba(0,0,0,0.4);">kuanza spin</span>
            </h2>

            <div class="w-full flex flex-col gap-4">
              <div>
                <label class="block text-white text-[11px] font-bold mb-1 uppercase tracking-wider" style="text-shadow: 0 1px 2px rgba(0,0,0,0.2);">Jina</label>
                <input v-model="addForm.name" class="w-full rounded-xl px-4 py-3 text-[#333] font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition-all" style="background: rgba(255,255,255,0.9); border: 3px solid #c24200;" placeholder="Jina lako..." />
              </div>

              <div>
                <label class="block text-white text-[11px] font-bold mb-1 uppercase tracking-wider" style="text-shadow: 0 1px 2px rgba(0,0,0,0.2);">Namba ya simu</label>
                <div class="relative flex items-center">
                  <span class="absolute left-4 text-[16px]">🇹🇿</span>
                  <input v-model="addForm.phone" type="tel" class="w-full rounded-xl pl-12 pr-4 py-3 text-[#333] font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition-all" style="background: rgba(255,255,255,0.9); border: 3px solid #c24200;" placeholder="+255..." />
                </div>
              </div>

              <div v-if="addError" class="bg-red-500/20 text-white text-[12px] font-bold text-center py-2 px-3 rounded-lg border border-red-400/30">{{ addError }}</div>

              <button 
                @click="addParticipant" 
                :disabled="addSubmitting"
                class="w-full mt-2 rounded-full py-4 flex items-center justify-center font-black text-[16px] tracking-wide transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                style="background: white; color: #E65C00; box-shadow: 0 4px 20px rgba(0,0,0,0.25);"
              >
                <Loader2 v-if="addSubmitting" class="w-5 h-5 animate-spin" />
                <span v-else>SUBMIT & SPIN</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ══════════════════════════════════════════════
       HERO  ─  4 / 5 / 3  grid
  ══════════════════════════════════════════════ -->
  <section id="hero" class="relative overflow-hidden" style="min-height:calc(100vh - 64px);background:transparent;">
    <!-- Confetti & Ornaments -->
    <ConfettiField :count="40" />
    <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(ellipse 70% 60% at 50% 10%, rgba(242,101,34,0.1) 0%, transparent 70%);"/>
    
    <!-- Floating Gifts Removed -->
    <div class="absolute right-[12%] top-[20%] pointer-events-none animate-pulse" style="animation-duration: 2s; font-size: 40px; opacity: 0.8;">✨</div>
    <div class="absolute left-[20%] bottom-[20%] pointer-events-none animate-pulse" style="animation-duration: 2.5s; font-size: 50px; opacity: 0.7;">🎉</div>

    <div class="relative z-30 w-full">
      <RecentWinnersTicker :participants="participants" />
    </div>

    <div class="relative z-10 flex flex-col justify-center h-full px-4 max-w-[1440px] mx-auto py-2" style="height:calc(100vh - 64px); max-height:calc(100vh - 64px); overflow:hidden;">
      
      <!-- Single Row 3-Column Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch h-full relative z-20" style="padding-top: 10px; padding-bottom: 10px;">

        <!-- ══════════════════════════════════════════
             LEFT COLUMN
        ══════════════════════════════════════════ -->
        <div class="hidden lg:flex lg:col-span-4 flex-col justify-between h-full overflow-hidden">
          
          <!-- Top: Spin & Win Title -->
          <div class="flex flex-col items-center gap-2 mb-2 w-full lg:w-max">
            <div class="flex justify-center mb-1">
              <img src="@/assets/Halote logo white-02.svg" alt="Halotel" style="height:28px;" />
            </div>
            
            <h1 class="font-black text-white text-center leading-[0.85] tracking-tighter uppercase animate-floating" style="font-size: clamp(65px, 8vw, 100px); -webkit-text-stroke: 4px #ff6a00; text-shadow: 0 1px 0 #d94a00, 0 2px 0 #d94a00, 0 3px 0 #d94a00, 0 4px 0 #c24200, 0 5px 0 #c24200, 0 6px 0 #c24200, 0 7px 0 #ab3a00, 0 8px 0 #ab3a00, 0 9px 0 #ab3a00, 0 10px 0 #8c2f00, 0 11px 0 #8c2f00, 0 15px 20px rgba(0,0,0,0.6);">
              SPIN <br/>
              & WIN
            </h1>

            <div class="relative mt-2 flex justify-center items-center px-4 w-full">
              <!-- Ribbon tails -->
              <div class="absolute left-0 top-[60%] -translate-y-1/2 w-5 h-8 bg-[#a83300]" style="clip-path: polygon(0 50%, 100% 0, 100% 100%);"></div>
              <div class="absolute right-0 top-[60%] -translate-y-1/2 w-5 h-8 bg-[#a83300]" style="clip-path: polygon(0 0, 100% 50%, 0 100%);"></div>
              
              <!-- Ribbon body -->
              <div class="relative z-10 px-6 py-1.5 bg-gradient-to-b from-[#ff8c1a] to-[#e65c00] rounded-[2px] font-black text-white shadow-lg border-b-2 border-[#b33c00] w-full text-center whitespace-nowrap" style="font-size:14px; letter-spacing:1px; transform: scaleY(1.05);">
                MSIMU WA SABASABA
              </div>
            </div>

            <div class="mt-2 text-white font-bold tracking-wide uppercase text-center" style="font-size: 13px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
              SPIN, SHINDA NA HALOTEL!
            </div>
          </div>

          <!-- Bottom: Zawadi Mini Card -->
          <div class="panel-card flex flex-col mt-auto mb-6" style="height:170px; background:#E65C00; border: 2px solid rgba(255,255,255,0.2); padding: 8px;">
            <div class="panel-header mb-2 flex-shrink-0">
              <div class="flex items-center gap-2">
                <div class="panel-header-icon text-sm" style="color:#FFD700;">🏆</div>
                <div class="panel-title" style="font-size:11px;">ZAWADI</div>
              </div>
            </div>
            <div class="flex-1 pr-1">
              <div class="grid grid-cols-4 gap-2 text-white">
                <template v-for="prize in prizes.filter(p => p.prizeType === 'win')" :key="prize.id">
                  <div class="flex items-center gap-2 bg-black/10 rounded p-1.5 border border-white/5">
                    <div class="prize-thumb-wrap" style="width:20px;height:20px;background:rgba(255,255,255,0.1); border-radius:4px; flex-shrink:0;">
                      <img v-if="prizeImgs[prize.id]" :src="prizeImgs[prize.id]" class="w-full h-full object-contain" />
                      <span v-else style="font-size:10px;">🎁</span>
                    </div>
                    <span class="font-bold leading-tight line-clamp-1" style="font-size:9px;">{{ prize.name }}</span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════
             CENTER COLUMN — WHEEL
        ══════════════════════════════════════════ -->
        <div class="lg:col-span-5 flex justify-center items-center h-full relative">
          <PrizeWheel
            :rotation="rotation"
            :phase="phase"
            :flashingSegment="flashingSegment"
            @spin="onWheelSpin"
          />
        </div>

        <!-- ══════════════════════════════════════════
             RIGHT COLUMN — 77 LOGO + HOW IT WORKS
        ══════════════════════════════════════════ -->
        <div class="hidden lg:flex lg:col-span-3 flex-col justify-between h-full overflow-hidden">

          <!-- Top: Big 77 Heart Logo (mirrors SPIN & WIN position) -->
          <div class="flex flex-col items-center gap-2 mb-2">
            <img src="@/assets/Artboard 1.png" alt="Halotel 77" class="animate-floating" style="width: clamp(200px, 22vw, 300px); height: auto; filter: brightness(0) invert(1) drop-shadow(0 4px 12px rgba(0,0,0,0.3)); animation-delay: 0.5s;" />
          </div>

          <!-- Bottom: Jinsi Inavyofanya Kazi -->
          <div class="panel-card flex-shrink-0 flex flex-col justify-center mb-6" style="height:170px; background:#E65C00; border: 2px solid rgba(255,255,255,0.2); padding: 10px;">
            <div class="panel-header mb-2">
              <div class="panel-title" style="font-size:11px;">JINSI INAVYOFANYA KAZI</div>
            </div>
            <div class="flex justify-between gap-2 text-center items-start mt-1 relative">
              <!-- Dividers -->
              <div class="absolute left-1/3 top-2 bottom-4 w-px bg-white/20"></div>
              <div class="absolute left-2/3 top-2 bottom-4 w-px bg-white/20"></div>

              <!-- Step 1 -->
              <div class="flex-1 flex flex-col items-center px-1">
                <div class="relative mb-2">
                  <div class="absolute -left-3 -top-1 w-4 h-4 rounded-full bg-[#E65C00] shadow-md flex items-center justify-center text-[10px] font-bold text-white border border-white/20 z-10">1</div>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-90">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h3 class="text-white font-bold leading-tight" style="font-size:10px;">Jaza formu</h3>
                <p class="text-white/80 mt-1 leading-tight" style="font-size:8px;">Jaza taarifa zako<br/>kwenye formu.</p>
              </div>
              
              <!-- Step 2 -->
              <div class="flex-1 flex flex-col items-center px-1">
                <div class="relative mb-2">
                  <div class="absolute -left-3 -top-1 w-4 h-4 rounded-full bg-[#E65C00] shadow-md flex items-center justify-center text-[10px] font-bold text-white border border-white/20 z-10">2</div>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-90">
                    <circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="9"></line><line x1="12" y1="15" x2="12" y2="22"></line><line x1="22" y1="12" x2="15" y2="12"></line><line x1="9" y1="12" x2="2" y2="12"></line><line x1="19.07" y1="4.93" x2="14.12" y2="9.88"></line><line x1="9.88" y1="14.12" x2="4.93" y2="19.07"></line><line x1="4.93" y1="4.93" x2="9.88" y2="9.88"></line><line x1="14.12" y1="14.12" x2="19.07" y2="19.07"></line>
                  </svg>
                </div>
                <h3 class="text-white font-bold leading-tight" style="font-size:10px;">Spin</h3>
                <p class="text-white/80 mt-1 leading-tight" style="font-size:8px;">Bonyeza kitufe cha<br/>SPIN na ujaribu.</p>
              </div>

              <!-- Step 3 -->
              <div class="flex-1 flex flex-col items-center px-1">
                <div class="relative mb-2">
                  <div class="absolute -left-3 -top-1 w-4 h-4 rounded-full bg-[#E65C00] shadow-md flex items-center justify-center text-[10px] font-bold text-white border border-white/20 z-10">3</div>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-90">
                    <rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13"></path><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"></path>
                  </svg>
                </div>
                <h3 class="text-white font-bold leading-tight" style="font-size:10px;">Shinda</h3>
                <p class="text-white/80 mt-1 leading-tight" style="font-size:8px;">Ukishinda, zawadi<br/>itatumwa kwako.</p>
              </div>
            </div>
          </div>

        </div>

      </div><!-- /grid -->

    </div>
  </section>

  <footer style="position: absolute; bottom: 0; width: 100%; padding:10px 24px;text-align:center; z-index: 50;">
    <p class="text-white font-black tracking-wide" style="font-size:12px;letter-spacing:0.5px; opacity: 0.8;">
      Kila spin ni nafasi yako ya kushinda! #HalotelSabasaba
    </p>
  </footer>
</template>

<style scoped>
/* ── Shared panel chrome ─────────────────────────────────────── */
.panel-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 0 2px;
}
.panel-title  { font-size: 11px; font-weight: 900; letter-spacing: 2.5px; color: white; text-transform: uppercase; }
.panel-sub    { font-size: 10px; color: rgba(255,255,255,0.7); font-weight: 500; margin-top: 1px; }
.panel-header-icon { font-size: 22px; }

.panel-card {
  background: #E65C00;
  border: 2px solid rgba(255,255,255,0.3);
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  border-radius: 16px; padding: 12px;
}

/* ── Prize list ──────────────────────────────────────────────── */
.prize-row {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.2s;
  cursor: default;
}
.prize-row:last-child { border-bottom: none; }
.prize-row--lit { background: rgba(242,101,34,0.1) !important; }
.prize-row:hover { background: rgba(255,255,255,0.03); }

.prize-swatch  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.prize-thumb-wrap {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  background: rgba(255,255,255,0.05);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.prize-thumb-img { width: 100%; height: 100%; object-fit: contain; }

.prize-name { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prob-bar-wrap { height: 3px; background: rgba(255,255,255,0.07); border-radius: 2px; margin-top: 4px; overflow: hidden; }
.prob-bar      { height: 100%; background: linear-gradient(to right, #F26522, #FF9A5C); border-radius: 2px; }
.prize-pct     { font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.35); white-space: nowrap; }

/* ── Add participant form ─────────────────────────────────────── */
.add-form-grid  { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
.phone-wrap     { position: relative; }
.phone-flag     { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; pointer-events: none; z-index: 1; }

.add-input {
  width: 100%; padding: 9px 12px;
  background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.09);
  border-radius: 10px; color: white; font-size: 13px;
  outline: none; transition: all 0.2s; box-sizing: border-box;
}
.add-input--phone { padding-left: 32px; }
.add-input::placeholder { color: rgba(255,255,255,0.2); }
.add-input:focus { border-color: #F26522; background: rgba(242,101,34,0.06); }

.add-form-row2 { display: flex; gap: 6px; align-items: center; }


.add-btn {
  flex: 1; padding: 7px 10px; border-radius: 8px;
  background: linear-gradient(135deg, #F26522, #D94F15);
  color: white; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;
  border: none; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  box-shadow: 0 3px 12px rgba(242,101,34,0.35);
}
.add-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(242,101,34,0.5); }
.add-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.add-error {
  margin-top: 6px; font-size: 11px; color: #f87171; font-weight: 600;
  background: rgba(239,68,68,0.08); padding: 5px 10px; border-radius: 7px;
  border: 1px solid rgba(239,68,68,0.2);
}

/* ── Empty state ─────────────────────────────────────────────── */
.empty-state {
  padding: 36px 16px; text-align: center;
}

/* ── Participant card ─────────────────────────────────────────── */
.p-card {
  display: flex; align-items: center; gap: 9px;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.2s, border-left 0.2s;
  border-left: 3px solid transparent;
  position: relative;
}
.p-card:last-child { border-bottom: none; }
.p-card:hover      { background: rgba(255,255,255,0.03); }

.p-card--selected { background: rgba(242,101,34,0.08); border-left-color: #F26522; }
.p-card--spinning { background: rgba(242,101,34,0.05); animation: card-pulse 1.5s ease-in-out infinite; }
.p-card--won      { background: rgba(34,197,94,0.05);  border-left-color: #22c55e; }
.p-card--no-win   { opacity: 0.65; }

@keyframes card-pulse {
  0%,100% { background: rgba(242,101,34,0.04); }
  50%      { background: rgba(242,101,34,0.12); }
}

.p-num {
  font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.2);
  width: 14px; text-align: center; flex-shrink: 0;
}
.p-avatar {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 900; color: white; position: relative;
}
.avatar-ring {
  position: absolute; inset: -3px; border-radius: 50%;
  border: 2px solid #F26522;
  box-shadow: 0 0 8px rgba(242,101,34,0.6);
  animation: ring-pulse 1.5s ease-in-out infinite;
}
@keyframes ring-pulse {
  0%,100% { box-shadow: 0 0 8px rgba(242,101,34,0.5); }
  50%      { box-shadow: 0 0 16px rgba(242,101,34,0.9); }
}

.p-info     { flex: 1; min-width: 0; }
.p-name     { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.9); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-phone    { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.p-result-inline {
  font-size: 11px; font-weight: 700; margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.p-result-inline--win      { color: #4ade80; }
.p-result-inline--loss     { color: rgba(255,255,255,0.35); }
.p-result-inline--spinning { color: white; }

.p-status-wrap { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }

.p-badge {
  font-size: 10px; font-weight: 800; padding: 3px 7px; border-radius: 6px;
  letter-spacing: 0.3px; white-space: nowrap;
}
.p-badge--pending  { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.25); font: inherit; }
.p-badge--spinning { background: rgba(255,255,255,0.12); color: white; }
.p-badge--won      { background: rgba(34,197,94,0.15);  color: #22c55e;  border: 1px solid rgba(34,197,94,0.3); font-size: 14px; }
.p-badge--lost     { background: rgba(100,116,139,0.12); color: #94a3b8; font-size: 14px; }

.p-delete {
  width: 18px; height: 18px; border-radius: 50%; font-size: 11px; line-height: 1;
  background: rgba(255,255,255,0.06); border: none;
  color: rgba(255,255,255,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; flex-shrink: 0;
}
.p-delete:hover { background: rgba(239,68,68,0.25); color: #f87171; }

/* ── Result detail row (below a participant card) ────────────── */
.p-result-row {
  padding: 6px 12px 8px 60px;
  font-size: 11px; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.p-result-row--win  { color: #4ade80; background: rgba(34,197,94,0.04); }
.p-result-row--loss { color: rgba(255,255,255,0.35); }

/* ── View all button ─────────────────────────────────────────── */
.view-all-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 14px; border-radius: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.55); font-size: 12px; font-weight: 700;
  text-decoration: none; transition: all 0.2s;
}
.view-all-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.25); color: white; }
.view-all-count {
  background: rgba(255,255,255,0.2); color: white;
  font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 99px;
}

/* ── Spin hint banner ─────────────────────────────────────────── */
.spin-hint {
  padding: 8px 12px; border-radius: 10px;
  background: rgba(242,101,34,0.1); border: 1px solid rgba(242,101,34,0.2);
  font-size: 11px; color: rgba(255,255,255,0.6); text-align: center; line-height: 1.5;
}
.spin-hint strong { color: white; }

/* ── How it works ─────────────────────────────────────────────── */
.how-num-small {
  width: 24px; height: 24px; border-radius: 50%; background: white;
  color: #E65C00; font-weight: 900; font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  margin-bottom: 8px;
}

@keyframes floating {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}
.animate-floating {
  animation: floating 3.5s ease-in-out infinite;
}

@keyframes spin-anim { to { transform: rotate(360deg); } }

.toast-enter-active, .toast-leave-active { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.toast-enter-from, .toast-leave-to { opacity:0; transform:translateX(-50%) translateY(-16px) scale(0.9); }
</style>

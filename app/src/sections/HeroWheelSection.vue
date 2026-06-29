<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  addDoc, updateDoc, deleteDoc, doc, collection,
  serverTimestamp, query, orderBy, where, onSnapshot, Timestamp,
} from 'firebase/firestore';
import { Loader2 } from 'lucide-vue-next';
import { db } from '@/firebase';
import PrizeWheel from '@/components/PrizeWheel.vue';
import ConfettiField from '@/components/ConfettiField.vue';
import { usePrizeStore, computeProbability } from '@/hooks/usePrizeStore';
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
  voucher_500: voucher500Img, voucher_2000: voucher2000Img, voucher_5000: voucher5000Img,
};

// ── Participant types ────────────────────────────────────────
type PStatus = 'pending' | 'spinning' | 'won' | 'no_win';
interface Participant {
  id: string;         // Firestore doc ID
  name: string;
  phone: string;
  gender: 'Mwanaume' | 'Mwanamke';
  status: PStatus;
  prizeId: string | null;
  prizeName: string | null;
  isClaimable: boolean | null;
}

const participants  = ref<Participant[]>([]);
const selectedId    = ref<string | null>(null);
const addSubmitting = ref(false);
const addError      = ref('');
const addForm       = reactive({ name: '', phone: '+255 ', gender: '' as '' | 'Mwanaume' | 'Mwanamke' });

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
    orderBy('timestamp', 'asc'),
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
        gender:      data.gender ?? 'Mwanaume',
        status,
        prizeId:     data.prizeId   ?? null,
        prizeName:   data.prizeName ?? null,
        isClaimable: data.isClaimable ?? null,
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

// ── Add participant ──────────────────────────────────────────
async function addParticipant() {
  addError.value = '';
  const name  = addForm.name.trim();
  const phone = addForm.phone.trim();
  if (!name)                               { addError.value = 'Ingiza jina'; return; }
  if (phone.replace(/\D/g, '').length < 9) { addError.value = 'Namba ya simu'; return; }
  if (!addForm.gender)                     { addError.value = 'Chagua jinsia'; return; }

  addSubmitting.value = true;
  try {
    // Write to Firestore — snapshot listener will add them to participants[] automatically
    const docRef = await addDoc(collection(db, 'spins'), {
      name, phone, gender: addForm.gender,
      timestamp: serverTimestamp(),
      prizeId: null, prizeName: null, isClaimable: null,
    });

    // Auto-select if nothing pending is selected
    if (!selectedId.value || selectedP.value?.status !== 'pending') {
      selectedId.value = docRef.id;
      if (props.phase === 'stopped') emit('spinAgain');
    }

    addForm.name = ''; addForm.phone = '+255 '; addForm.gender = '';
  } catch {
    addError.value = 'Hitilafu ya mtandao. Jaribu tena.';
  }
  addSubmitting.value = false;
}

// ── Participant selection ────────────────────────────────────
function selectParticipant(id: string) {
  const p = participants.value.find(p => p.id === id);
  if (!p || p.status === 'spinning') return;
  selectedId.value = id;
  if (props.phase === 'stopped') emit('spinAgain');
}

async function removeParticipant(id: string, event: MouseEvent) {
  event.stopPropagation();
  if (selectedId.value === id) {
    selectedId.value = participants.value.find(p => p.status === 'pending' && p.id !== id)?.id ?? null;
  }
  try {
    // Delete from Firestore — snapshot listener removes them from participants[] automatically
    await deleteDoc(doc(db, 'spins', id));
  } catch { /* silent */ }
}

// ── Spin trigger ─────────────────────────────────────────────
function onWheelSpin() {
  const p = selectedP.value;
  if (!p || p.status !== 'pending') return;
  p.status = 'spinning'; // optimistic local update; Firestore gets updated on result
  emit('spin');
}

// ── Capture result ───────────────────────────────────────────
watch(() => props.winResult, async (prize) => {
  if (!prize) return;
  const p = selectedP.value;
  if (!p || p.status !== 'spinning') return;

  p.status      = prize.claimable ? 'won' : 'no_win';
  p.prizeId     = prize.id;
  p.prizeName   = prize.name;
  p.isClaimable = prize.claimable;

  try {
    await updateDoc(doc(db, 'spins', p.id), {
      prizeId: prize.id, prizeName: prize.name, isClaimable: prize.claimable,
    });
  } catch { /* silent */ }

  // Auto-advance to next pending participant after 2.5 s
  setTimeout(() => {
    const next = participants.value.find(q => q.status === 'pending');
    selectedId.value = next?.id ?? null;
    emit('spinAgain');
  }, 2500);
});

// ── Highlight the recently won prize in the prize list ───────
const lastWonPrizeId = computed(() => {
  const active = participants.value.find(p => p.status === 'spinning' || p.status === 'won');
  return active?.prizeId ?? null;
});
</script>

<template>
  <!-- ══════════════════════════════════════════════
       HERO  ─  3 / 6 / 3  grid
  ══════════════════════════════════════════════ -->
  <section id="hero" class="relative overflow-hidden" style="min-height:calc(100vh - 64px);background:#09090D;">
    <ConfettiField :count="40" />
    <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(ellipse 70% 60% at 50% 10%, rgba(242,101,34,0.1) 0%, transparent 70%);"/>

    <div class="relative z-10 flex flex-col justify-center h-full px-4 max-w-[1440px] mx-auto py-6" style="min-height:calc(100vh - 64px);">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

        <!-- ══════════════════════════════════════════
             LEFT  —  ZAWADI (prizes)
        ══════════════════════════════════════════ -->
        <div class="hidden lg:flex lg:col-span-3 flex-col gap-3" style="max-height:calc(100vh - 130px);">

          <!-- Panel header -->
          <div class="panel-header">
            <div>
              <div class="panel-title">ZAWADI</div>
              <div class="panel-sub">{{ prizes.length }} prizes available</div>
            </div>
            <div class="panel-header-icon">🏆</div>
          </div>

          <!-- Prize list -->
          <div class="panel-card flex-1" style="overflow-y:auto;padding:0;">
            <div
              v-for="prize in prizes" :key="prize.id"
              class="prize-row"
              :class="{ 'prize-row--lit': lastWonPrizeId === prize.id }"
            >
              <!-- Color swatch -->
              <div class="prize-swatch" :style="{ background: prize.color }" />

              <!-- Prize image thumb -->
              <div class="prize-thumb-wrap">
                <img v-if="prizeImgs[prize.id]" :src="prizeImgs[prize.id]" :alt="prize.name" class="prize-thumb-img" />
                <span v-else style="font-size:16px;">{{ prize.id === 'jaribu' ? '🔄' : '🙏' }}</span>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="prize-name">{{ prize.name }}</div>
                <div class="prob-bar-wrap">
                  <div class="prob-bar" :style="{ width: Math.min(100, computeProbability(prize, prizes) * 4) + '%' }" />
                </div>
              </div>

              <!-- Probability -->
              <div class="prize-pct">{{ computeProbability(prize, prizes).toFixed(1) }}%</div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════
             CENTER  —  WHEEL
        ══════════════════════════════════════════ -->
        <div class="lg:col-span-6 flex justify-center items-center">
          <PrizeWheel
            :rotation="rotation"
            :phase="phase"
            :flashingSegment="flashingSegment"
            @spin="onWheelSpin"
          />
        </div>

        <!-- ══════════════════════════════════════════
             RIGHT  —  WASHIRIKI (participants)
        ══════════════════════════════════════════ -->
        <div class="hidden lg:flex lg:col-span-3 flex-col gap-3" style="max-height:calc(100vh - 130px);">

          <!-- Panel header -->
          <div class="panel-header">
            <div>
              <div class="panel-title">WASHIRIKI</div>
              <div class="panel-sub">{{ participants.length }} wamejiunga</div>
            </div>
            <div class="panel-header-icon" style="font-size:18px;">
              <span v-if="selectedP && selectedP.status === 'pending'" style="color:#F26522">▶ Ready</span>
              <span v-else-if="selectedP?.status === 'spinning'" style="color:#F26522">⏳</span>
              <span v-else>👤</span>
            </div>
          </div>

          <!-- Add form -->
          <div class="panel-card">
            <div class="add-form-grid">
              <input v-model="addForm.name"  class="add-input" placeholder="Jina kamili..." @keydown.enter="addParticipant" />
              <div class="phone-wrap">
                <span class="phone-flag">🇹🇿</span>
                <input v-model="addForm.phone" class="add-input add-input--phone" placeholder="+255 7xx xxx xxx" type="tel" @keydown.enter="addParticipant" />
              </div>
            </div>
            <div class="add-form-row2">
              <button
                v-for="g in ['Mwanaume', 'Mwanamke']" :key="g"
                class="gender-btn"
                :class="{ 'gender-btn--active': addForm.gender === g }"
                @click="addForm.gender = g as any"
              >{{ g === 'Mwanaume' ? '♂ M' : '♀ F' }}</button>
              <button class="add-btn" @click="addParticipant" :disabled="addSubmitting">
                <Loader2 v-if="addSubmitting" class="w-3.5 h-3.5" style="animation:spin-anim 0.8s linear infinite;" />
                <template v-else>+ ONGEZA</template>
              </button>
            </div>
            <div v-if="addError" class="add-error">{{ addError }}</div>
          </div>

          <!-- Participant list -->
          <div class="panel-card flex-1" style="overflow-y:auto;padding:0;">
            <!-- Empty state -->
            <div v-if="participants.length === 0" class="empty-state">
              <div style="font-size:32px;margin-bottom:8px;">👆</div>
              <div style="font-weight:700;color:rgba(255,255,255,0.6);font-size:13px;margin-bottom:4px;">Ongeza mshiriki</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.3);">Jaza fomu halafu bonyeza + ONGEZA</div>
            </div>

            <!-- Participant cards (max 5 shown) -->
            <div
              v-for="(p, idx) in participants.slice(0, 5)" :key="p.id"
              class="p-card"
              :class="{
                'p-card--selected': p.id === selectedId && p.status === 'pending',
                'p-card--spinning': p.status === 'spinning',
                'p-card--won':     p.status === 'won',
                'p-card--no-win':  p.status === 'no_win',
              }"
              @click="selectParticipant(p.id)"
            >
              <!-- Position number -->
              <div class="p-num">{{ idx + 1 }}</div>

              <!-- Avatar -->
              <div
                class="p-avatar"
                :style="{ background: p.gender === 'Mwanaume' ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : 'linear-gradient(135deg,#ec4899,#9d174d)' }"
              >
                <span>{{ p.name.charAt(0).toUpperCase() }}</span>
                <!-- Selected ring -->
                <div v-if="p.id === selectedId && p.status === 'pending'" class="avatar-ring" />
              </div>

              <!-- Info -->
              <div class="p-info">
                <div class="p-name">{{ p.name }}</div>
                <!-- Prize inline — replaces phone once spin is done -->
                <div v-if="p.status === 'won'" class="p-result-inline p-result-inline--win">
                  🏆 {{ p.prizeName }}
                </div>
                <div v-else-if="p.status === 'no_win'" class="p-result-inline p-result-inline--loss">
                  🔄 Jaribu tena
                </div>
                <div v-else-if="p.status === 'spinning'" class="p-result-inline p-result-inline--spinning">
                  ⏳ Inazunguka…
                </div>
                <div v-else class="p-phone">{{ p.phone }}</div>
              </div>

              <!-- Status badge -->
              <div class="p-status-wrap">
                <button
                  v-if="p.status === 'pending'"
                  class="p-badge p-badge--pending"
                  :style="p.id === selectedId ? 'cursor:pointer;' : 'cursor:default;opacity:0.6;'"
                  @click.stop="p.id === selectedId ? onWheelSpin() : selectParticipant(p.id)"
                >{{ p.id === selectedId ? '▶ SPIN' : 'Subiri' }}</button>
                <div v-else-if="p.status === 'spinning'" class="p-badge p-badge--spinning">⏳</div>
                <div v-else-if="p.status === 'won'" class="p-badge p-badge--won">🏆</div>
                <div v-else class="p-badge p-badge--lost">🔄</div>

                <!-- Delete -->
                <button
                  v-if="p.status !== 'spinning'"
                  class="p-delete"
                  @click="removeParticipant(p.id, $event)"
                >×</button>
              </div>
            </div>

          </div>

          <!-- View all link -->
          <RouterLink
            v-if="participants.length > 0"
            to="/washiriki"
            class="view-all-btn"
          >
            <span>Orodha Kamili</span>
            <span class="view-all-count">{{ participants.length }}</span>
            <span style="margin-left:auto;font-size:13px;">→</span>
          </RouterLink>

          <!-- Spin hint at bottom -->
          <div v-if="selectedP && selectedP.status === 'pending'" class="spin-hint">
            ▶ Bonyeza <strong>SPIN</strong> kwenye gurudemu kwa {{ selectedP.name }}
          </div>
          <div v-else-if="!selectedP && participants.length > 0" class="spin-hint" style="opacity:0.5;">
            Chagua mshiriki kutoka kwenye orodha
          </div>
        </div>

      </div><!-- /grid -->
    </div>
  </section>

  <!-- ══════════════════════════════════════════════
       HOW IT WORKS  +  FOOTER
  ══════════════════════════════════════════════ -->
  <section id="jinsi" style="background:#09090D;padding:60px 24px;">
    <div class="max-w-[900px] mx-auto text-center">
      <h2 class="font-black text-white uppercase tracking-wide mb-10" style="font-size:20px;letter-spacing:2px;">JINSI INAVYOFANYA KAZI</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="how-step">
          <div class="how-num">1</div>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F26522" stroke-width="1.5" stroke-linecap="round" class="mx-auto mb-3">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <h3 class="text-white font-bold mb-2" style="font-size:15px;">Ongeza Mshiriki</h3>
          <p style="color:rgba(255,255,255,0.45);font-size:13px;line-height:1.6;">Ingiza jina, namba ya simu na jinsia — bonyeza ONGEZA.</p>
        </div>
        <div class="how-step">
          <div class="how-num">2</div>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F26522" stroke-width="1.5" stroke-linecap="round" class="mx-auto mb-3">
            <circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/>
          </svg>
          <h3 class="text-white font-bold mb-2" style="font-size:15px;">Spin</h3>
          <p style="color:rgba(255,255,255,0.45);font-size:13px;line-height:1.6;">Mshiriki aliyechaguliwa ataonekana — bonyeza SPIN kwenye gurudemu.</p>
        </div>
        <div class="how-step">
          <div class="how-num">3</div>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F26522" stroke-width="1.5" stroke-linecap="round" class="mx-auto mb-3">
            <path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
          </svg>
          <h3 class="text-white font-bold mb-2" style="font-size:15px;">Shinda</h3>
          <p style="color:rgba(255,255,255,0.45);font-size:13px;line-height:1.6;">Matokeo yanaonekana mara moja — endelea na mshiriki mwingine.</p>
        </div>
      </div>
    </div>
  </section>

  <footer style="background:linear-gradient(to right,#F26522,#E03E00);padding:22px 24px;text-align:center;">
    <p class="text-white font-black tracking-wide" style="font-size:15px;letter-spacing:0.5px;">
      Kila spin ni nafasi yako ya kushinda! <span style="opacity:0.8;">#HalotelSabasaba</span>
    </p>
  </footer>
</template>

<style scoped>
/* ── Shared panel chrome ─────────────────────────────────────── */
.panel-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 0 2px;
}
.panel-title  { font-size: 11px; font-weight: 900; letter-spacing: 2.5px; color: #F26522; text-transform: uppercase; }
.panel-sub    { font-size: 10px; color: rgba(255,255,255,0.3); font-weight: 500; margin-top: 1px; }
.panel-header-icon { font-size: 22px; }

.panel-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
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
.gender-btn {
  padding: 7px 10px; border-radius: 8px; font-size: 11px; font-weight: 700;
  background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.18s; white-space: nowrap;
}
.gender-btn--active { background: #F26522; border-color: #F26522; color: white; }

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
.p-result-inline--spinning { color: #F26522; }

.p-status-wrap { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }

.p-badge {
  font-size: 10px; font-weight: 800; padding: 3px 7px; border-radius: 6px;
  letter-spacing: 0.3px; white-space: nowrap;
}
.p-badge--pending  { background: rgba(242,101,34,0.15); color: #F26522; border: 1px solid rgba(242,101,34,0.25); font: inherit; }
.p-badge--spinning { background: rgba(242,101,34,0.12); color: #F26522; }
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
.view-all-btn:hover { background: rgba(242,101,34,0.1); border-color: rgba(242,101,34,0.25); color: #F26522; }
.view-all-count {
  background: rgba(242,101,34,0.2); color: #F26522;
  font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 99px;
}

/* ── Spin hint banner ─────────────────────────────────────────── */
.spin-hint {
  padding: 8px 12px; border-radius: 10px;
  background: rgba(242,101,34,0.1); border: 1px solid rgba(242,101,34,0.2);
  font-size: 11px; color: rgba(255,255,255,0.6); text-align: center; line-height: 1.5;
}
.spin-hint strong { color: #F26522; }

/* ── How it works ─────────────────────────────────────────────── */
.how-step {
  position: relative; padding: 32px 24px; border-radius: 20px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  text-align: center; transition: all 0.3s;
}
.how-step:hover { background: rgba(242,101,34,0.06); border-color: rgba(242,101,34,0.2); transform: translateY(-4px); }
.how-num {
  position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
  width: 28px; height: 28px; border-radius: 50%; background: #F26522;
  color: white; font-weight: 900; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(242,101,34,0.5);
}

@keyframes spin-anim { to { transform: rotate(360deg); } }
</style>

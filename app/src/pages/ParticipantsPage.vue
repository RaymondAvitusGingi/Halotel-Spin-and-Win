<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { RouterLink } from 'vue-router';
import { db } from '@/firebase';

interface Spin {
  id: string;
  phone: string;
  prizeId: string | null;
  prizeName: string | null;
  isClaimable: boolean | null;
  timestamp: { toDate(): Date } | null;
}

const spins   = ref<Spin[]>([]);
const loading = ref(true);
const search  = ref('');
const filter  = ref<'all' | 'won' | 'lost'>('all');
let unsub: (() => void) | null = null;

onMounted(() => {
  unsub = onSnapshot(
    query(collection(db, 'spins'), orderBy('timestamp', 'desc')),
    (snap) => {
      spins.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Spin));
      loading.value = false;
    },
    () => { loading.value = false; }
  );
});
onUnmounted(() => unsub?.());

const filtered = computed(() => {
  let list = spins.value;
  if (filter.value === 'won')  list = list.filter(s => s.isClaimable === true);
  if (filter.value === 'lost') list = list.filter(s => s.isClaimable === false || s.isClaimable === null);
  const q = search.value.trim().toLowerCase();
  if (q) list = list.filter(s => s.phone?.includes(q));
  return list;
});

const totalSpins   = computed(() => spins.value.length);
const totalWinners = computed(() => spins.value.filter(s => s.isClaimable).length);
const totalPending = computed(() => spins.value.filter(s => s.isClaimable === null).length);
const winRate      = computed(() => totalSpins.value > 0 ? ((totalWinners.value / totalSpins.value) * 100).toFixed(1) : '0.0');

function formatTime(s: Spin) {
  if (!s.timestamp) return '—';
  try {
    const d = s.timestamp.toDate();
    return d.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' }) + ' · ' +
           d.toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short' });
  } catch { return '—'; }
}

function avatarBg() {
  return 'linear-gradient(135deg,#F26522,#d94a00)';
}
</script>

<template>
  <div style="min-height:100vh;background:radial-gradient(ellipse at top, #F26522 0%, #a83300 100%);padding-top:72px;">
    <div class="max-w-[1100px] mx-auto px-5 py-8">

      <!-- Back + title -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:28px;">
        <RouterLink to="/" style="
          display:flex;align-items:center;gap:6px;
          padding:8px 14px;border-radius:10px;
          background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
          color:rgba(255,255,255,0.6);font-size:13px;font-weight:700;text-decoration:none;
          transition:all 0.2s;
        " onmouseenter="this.style.background='rgba(242,101,34,0.1)';this.style.color='#F26522'"
           onmouseleave="this.style.background='rgba(255,255,255,0.05)';this.style.color='rgba(255,255,255,0.6)'"
        >← Rudi</RouterLink>
        <div>
          <div style="font-size:20px;font-weight:900;color:white;letter-spacing:-0.3px;">Washiriki Wote</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:1px;">Rekodi kamili ya wote waliocheza</div>
        </div>
      </div>

      <!-- Stat cards -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px;">
        <div class="stat-card">
          <div class="stat-value">{{ totalSpins }}</div>
          <div class="stat-label">Jumla</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:#22c55e;">{{ totalWinners }}</div>
          <div class="stat-label">Washindi</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:#94a3b8;">{{ totalPending }}</div>
          <div class="stat-label">Wanasubiri</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:white;">{{ winRate }}%</div>
          <div class="stat-label">Kiwango Ushindi</div>
        </div>
      </div>

      <!-- Search + filter bar -->
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
        <div style="position:relative;flex:1;min-width:200px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round"
            style="position:absolute;left:12px;top:50%;transform:translateY(-50%);pointer-events:none">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input v-model="search" placeholder="Tafuta jina au namba..." style="
            width:100%;padding:10px 12px 10px 34px;box-sizing:border-box;
            background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.09);
            border-radius:10px;color:white;font-size:13px;outline:none;
          " />
        </div>
        <div style="display:flex;gap:6px;">
          <button v-for="f in [{k:'all',l:'Wote'},{k:'won',l:'Washindi'},{k:'lost',l:'Hawakushinda'}]" :key="f.k"
            @click="filter = f.k as any"
            :style="{
              padding:'9px 14px',borderRadius:'10px',fontSize:'12px',fontWeight:'700',
              cursor:'pointer',border:'1.5px solid',transition:'all 0.2s',
              background: filter === f.k ? 'white' : 'rgba(255,255,255,0.04)',
              borderColor: filter === f.k ? 'white' : 'rgba(255,255,255,0.09)',
              color: filter === f.k ? '#F26522' : 'rgba(255,255,255,0.8)',
            }"
          >{{ f.l }}</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" style="text-align:center;padding:60px;color:rgba(255,255,255,0.3);font-size:13px;">
        Inapakia...
      </div>

      <!-- Empty -->
      <div v-else-if="filtered.length === 0" style="text-align:center;padding:60px;">
        <div style="font-size:40px;margin-bottom:12px;">🔍</div>
        <div style="color:rgba(255,255,255,0.4);font-size:14px;font-weight:700;">Hakuna washiriki wanaolingana</div>
      </div>

      <!-- Participant list -->
      <div v-else style="display:flex;flex-direction:column;gap:6px;">
        <!-- Header row -->
        <div style="
          display:grid;grid-template-columns:40px 1.5fr 1fr 120px 130px;gap:12px;
          padding:8px 16px;font-size:10px;font-weight:800;letter-spacing:1.5px;
          color:rgba(255,255,255,0.6);text-transform:uppercase;
        ">
          <div>#</div>
          <div>Mshiriki (Simu)</div>
          <div>Zawadi</div>
          <div>Hali</div>
          <div>Wakati</div>
        </div>

        <!-- Rows -->
        <div
          v-for="(s, idx) in filtered" :key="s.id"
          style="
            display:grid;grid-template-columns:40px 1.5fr 1fr 120px 130px;gap:12px;align-items:center;
            padding:12px 16px;border-radius:12px;
            background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
            transition:background 0.2s;
          "
          onmouseenter="this.style.background='rgba(255,255,255,0.055)'"
          onmouseleave="this.style.background='rgba(255,255,255,0.03)'"
        >
          <!-- # -->
          <div style="font-size:11px;font-weight:800;color:rgba(255,255,255,0.5);">{{ idx + 1 }}</div>

          <!-- Phone + avatar -->
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <div :style="{
              width:'34px',height:'34px',borderRadius:'50%',flexShrink:0,
              background:avatarBg(),
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:'12px',fontWeight:'900',color:'white',
            }">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </div>
            <div style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.9);font-family:monospace;">
              {{ s.phone || '—' }}
            </div>
          </div>

          <!-- Prize -->
          <div style="min-width:0;">
            <div v-if="s.prizeName" style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              {{ s.prizeName }}
            </div>
            <div v-else style="font-size:12px;color:rgba(255,255,255,0.2);">—</div>
          </div>

          <!-- Status badge -->
          <div>
            <span v-if="s.isClaimable === true" style="
              display:inline-flex;align-items:center;gap:5px;
              padding:4px 10px;border-radius:99px;font-size:11px;font-weight:800;
              background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.3);
            ">🏆 Shinda</span>
            <span v-else-if="s.isClaimable === false" style="
              display:inline-flex;align-items:center;gap:5px;
              padding:4px 10px;border-radius:99px;font-size:11px;font-weight:800;
              background:rgba(100,116,139,0.12);color:#94a3b8;border:1px solid rgba(100,116,139,0.2);
            ">🔄 Jaribu</span>
            <span v-else style="
              display:inline-flex;align-items:center;gap:5px;
              padding:4px 10px;border-radius:99px;font-size:11px;font-weight:800;
              background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.2);
            ">⏳ Subiri</span>
          </div>

          <!-- Time -->
          <div style="font-size:11px;color:rgba(255,255,255,0.6);">{{ formatTime(s) }}</div>
        </div>

        <!-- Footer count -->
        <div style="text-align:center;padding:16px;font-size:11px;color:rgba(255,255,255,0.2);">
          Inaonyesha {{ filtered.length }} kati ya {{ totalSpins }} washiriki
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px; padding: 16px 18px; text-align: center;
}
.stat-value { font-size: 28px; font-weight: 900; color: white; line-height: 1; }
.stat-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.7); margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }

input::placeholder { color: rgba(255,255,255,0.2); }
input:focus { border-color: #F26522 !important; }
</style>

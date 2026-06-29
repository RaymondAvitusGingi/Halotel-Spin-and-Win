<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { usePrizeStore, computeProbability, rarityLabel, rarityColor } from '@/hooks/usePrizeStore'
import type { Prize } from '@/hooks/usePrizeStore'
import { Plus, Pencil, Trash2, X, Gift, Package, LayoutDashboard, Shield, LogOut, Upload, Trophy, Download, Star } from 'lucide-vue-next'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { auth, db, firebaseConfig } from '@/firebase'
import braceletImg from '@/assets/prizes/bracelet.png'
import capImg from '@/assets/prizes/cap.png'
import penKeyholderImg from '@/assets/prizes/pen-keyholder.png'
import voucher500Img from '@/assets/prizes/voucher-500.png'
import voucher2000Img from '@/assets/prizes/voucher-2000.png'
import voucher5000Img from '@/assets/prizes/voucher-5000.png'

const { prizes, totalQuantity, addPrize, updatePrize, deletePrize, resetDefaults } = usePrizeStore()

const prizeImages: Record<string, string> = {
  bracelets: braceletImg, cap: capImg, pen_keyholder: penKeyholderImg,
  'pen-keyholder': penKeyholderImg, voucher_500: voucher500Img,
  voucher_2000: voucher2000Img, voucher_5000: voucher5000Img,
}

function getDefaultImg(prize: Prize): string | null {
  for (const [k, v] of Object.entries(prizeImages)) {
    if (prize.id.includes(k) || prize.name.toLowerCase().includes(k.replace('_', ' '))) return v
    if (prize.swahiliName.toLowerCase().includes(k.replace('_', ' '))) return v
  }
  return null
}

const activeTab = ref<'dashboard' | 'prizes' | 'winners' | 'admin'>('dashboard')

// ─── Auth ──────────────────────────────────────────────────────────────
interface AdminUser { id: string; name: string; email: string; role: string; status: string }

const isLoggedIn = ref(false)
const loginEmail = ref('')
const loginPass = ref('')
const loginError = ref('')
const loginLoading = ref(false)
const currentAdmin = ref<AdminUser | null>(null)

const unsubAuth = onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const snap = await getDoc(doc(db, 'admins', user.uid))
      if (snap.exists() && snap.data()?.status === 'active') {
        currentAdmin.value = { id: user.uid, email: user.email!, ...snap.data() } as AdminUser
        isLoggedIn.value = true
      } else if (!snap.exists()) {
        const all = await getDocs(collection(db, 'admins'))
        if (all.empty) {
          const name = user.displayName || user.email!.split('@')[0]
          await setDoc(doc(db, 'admins', user.uid), { name, email: user.email!, role: 'admin', status: 'active' })
          currentAdmin.value = { id: user.uid, email: user.email!, name, role: 'admin', status: 'active' }
          isLoggedIn.value = true
        } else { loginError.value = 'Access denied.'; await signOut(auth) }
      } else { loginError.value = 'Account disabled.'; await signOut(auth) }
    } catch { await signOut(auth) }
  } else { isLoggedIn.value = false; currentAdmin.value = null }
})
onUnmounted(() => unsubAuth())

async function handleLogin() {
  loginError.value = ''
  if (!loginEmail.value || !loginPass.value) { loginError.value = 'Please enter email and password'; return }
  loginLoading.value = true
  try { await signInWithEmailAndPassword(auth, loginEmail.value, loginPass.value) }
  catch { loginError.value = 'Invalid email or password' }
  finally { loginLoading.value = false }
}
async function handleLogout() { await signOut(auth); loginEmail.value = ''; loginPass.value = '' }

// ─── Prize Management ─────────────────────────────────────────────────
const showModal = ref(false)
const editingPrize = ref<Prize | null>(null)
const showDeleteConfirm = ref<string | null>(null)
const thumbnailPreview = ref<string | null>(null)

const form = ref({
  name: '', swahiliName: '', rarity: 3, quantity: null as number | null,
  claimable: true, amount: '', subtitle: '', thumbnail: '',
})

// Live probability preview based on current form values
const probPreview = computed(() => {
  const tempPrize: Prize = {
    id: editingPrize.value?.id || '__temp__',
    name: form.value.name || 'New',
    swahiliName: form.value.swahiliName || '',
    color: '#000', order: 0,
    rarity: form.value.rarity,
    quantity: form.value.quantity,
    claimable: form.value.claimable,
  }
  const others = prizes.value.filter(p => p.id !== tempPrize.id)
  return computeProbability(tempPrize, [...others, tempPrize]).toFixed(1)
})

function handleThumbnailUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { thumbnailPreview.value = reader.result as string; form.value.thumbnail = reader.result as string }
  reader.readAsDataURL(file)
}

function openAdd() {
  editingPrize.value = null
  form.value = { name: '', swahiliName: '', rarity: 3, quantity: null, claimable: true, amount: '', subtitle: '', thumbnail: '' }
  thumbnailPreview.value = null
  showModal.value = true
}

function openEdit(prize: Prize) {
  editingPrize.value = prize
  form.value = {
    name: prize.name, swahiliName: prize.swahiliName,
    rarity: prize.rarity ?? 3,
    quantity: prize.quantity,
    claimable: prize.claimable ?? true,
    amount: prize.amount || '', subtitle: prize.subtitle || '', thumbnail: prize.thumbnail || '',
  }
  thumbnailPreview.value = prize.thumbnail || getDefaultImg(prize) || null
  showModal.value = true
}

function save() {
  if (!form.value.name || !form.value.swahiliName) return
  const payload = {
    name: form.value.name, swahiliName: form.value.swahiliName,
    rarity: form.value.rarity, quantity: form.value.quantity, claimable: form.value.claimable,
    amount: form.value.amount || undefined,
    subtitle: form.value.subtitle || undefined,
    thumbnail: form.value.thumbnail || undefined,
  }
  if (editingPrize.value) { updatePrize(editingPrize.value.id, payload) }
  else { addPrize(payload) }
  showModal.value = false
}

function confirmDelete(id: string) { showDeleteConfirm.value = id }
function executeDelete() { if (showDeleteConfirm.value) { deletePrize(showDeleteConfirm.value); showDeleteConfirm.value = null } }

function getPrizeThumb(prize: Prize): string | null {
  return prize.thumbnail || getDefaultImg(prize)
}

// ─── Participants (all spins) ─────────────────────────────────────────
interface Winner {
  id: string; name: string; phone: string; gender: string
  prizeId: string | null; prizeName: string | null; isClaimable: boolean | null
  timestamp: any
}
const winners = ref<Winner[]>([])
const spinsFilter = ref<'all' | 'winners'>('all')
const filteredSpins = computed(() =>
  spinsFilter.value === 'winners'
    ? winners.value.filter(w => w.isClaimable)
    : winners.value
)
let unsubWinners: (() => void) | null = null

function formatDate(ts: any): string {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function genderColor(g: string): string {
  if (g === 'Mwanaume') return '#3b82f6'
  if (g === 'Mwanamke') return '#ec4899'
  return '#8b5cf6'
}

function exportWinnersCSV() {
  const rows = [
    ['Name', 'Phone', 'Gender', 'Prize', 'Won?', 'Date'],
    ...filteredSpins.value.map(w => [
      w.name, w.phone, w.gender,
      w.prizeName || '—',
      w.isClaimable ? 'YES' : 'NO',
      formatDate(w.timestamp),
    ]),
  ]
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `spins-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}

// ─── Dashboard Stats ──────────────────────────────────────────────────
const stats = computed(() => [
  { label: 'Total Prizes', value: prizes.value.length, icon: Gift, color: '#FF4500', bg: '#FFF0EB' },
  { label: 'Total Stock',  value: totalQuantity.value,  icon: Package, color: '#16a34a', bg: '#f0fdf4' },
  { label: 'Total Spins', value: winners.value.length, icon: Trophy, color: '#eab308', bg: '#fefce8' },
  { label: 'Avg Rarity',  value: prizes.value.length ? (prizes.value.reduce((s,p) => s + p.rarity, 0) / prizes.value.length).toFixed(1) + '/10' : '—', icon: Star, color: '#8b5cf6', bg: '#f5f3ff' },
])

// ─── Admin Management ─────────────────────────────────────────────────
const adminUsers = ref<AdminUser[]>([])
const showAdminModal = ref(false)
const editingAdminId = ref<string | null>(null)
const adminForm = ref({ name: '', email: '', password: '', role: 'admin' })
const deletingAdminId = ref<string | null>(null)
let unsubAdmins: (() => void) | null = null

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    unsubAdmins = onSnapshot(collection(db, 'admins'), (snap) => {
      adminUsers.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminUser))
    })
    unsubWinners = onSnapshot(
      query(collection(db, 'spins'), orderBy('timestamp', 'desc')),
      (snap) => { winners.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Winner)) }
    )
  } else {
    unsubAdmins?.(); unsubAdmins = null; adminUsers.value = []
    unsubWinners?.(); unsubWinners = null; winners.value = []
  }
})
onUnmounted(() => { unsubAdmins?.(); unsubWinners?.() })

function openAddAdmin() { editingAdminId.value = null; adminForm.value = { name: '', email: '', password: '', role: 'admin' }; showAdminModal.value = true }
function openEditAdmin(user: AdminUser) { editingAdminId.value = user.id; adminForm.value = { name: user.name, email: user.email, password: '', role: user.role }; showAdminModal.value = true }

async function saveAdmin() {
  if (!adminForm.value.name || !adminForm.value.email) return
  if (editingAdminId.value) {
    await updateDoc(doc(db, 'admins', editingAdminId.value), { name: adminForm.value.name, role: adminForm.value.role })
  } else {
    if (!adminForm.value.password || adminForm.value.password.length < 6) return
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`)
    const secondaryAuth = getAuth(secondaryApp)
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, adminForm.value.email, adminForm.value.password)
      await setDoc(doc(db, 'admins', cred.user.uid), { name: adminForm.value.name, email: adminForm.value.email, role: adminForm.value.role, status: 'active' })
    } finally { await deleteApp(secondaryApp) }
  }
  showAdminModal.value = false
}

async function toggleAdminStatus(user: AdminUser) {
  if (user.id === currentAdmin.value?.id) return
  await updateDoc(doc(db, 'admins', user.id), { status: user.status === 'active' ? 'disabled' : 'active' })
}

function confirmDeleteAdmin(id: string) { deletingAdminId.value = id }
async function executeDeleteAdmin() {
  if (!deletingAdminId.value) return
  await deleteDoc(doc(db, 'admins', deletingAdminId.value))
  deletingAdminId.value = null
}
</script>

<template>
  <div class="admin-layout">
    <!-- ═══ LOGIN SCREEN (shown when not logged in) ═══ -->
    <div v-if="!isLoggedIn" class="admin-main login-center">
      <div class="login-page">
        <div class="login-header">
          <div class="login-header__bg-shapes">
            <div class="login-header__circle login-header__circle--1"></div>
            <div class="login-header__circle login-header__circle--2"></div>
          </div>
          <div class="login-header__content">
            <img src="@/assets/Halote logo white-02.svg" alt="Halotel" style="height: 48px; margin-bottom: 6px;" />
            <p class="login-header__subtitle">Admin Panel Access</p>
          </div>
        </div>
        <div class="login-card">
          <h2 class="login-card__title">Admin Login</h2>
          <div v-if="loginError" class="login-card__error">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#dc2626" stroke-width="1.5"/><path d="M8 4.5V9" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="11.5" r="0.75" fill="#dc2626"/></svg>
            {{ loginError }}
          </div>
          <div class="login-field">
            <div class="login-field__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div class="login-field__input-wrap">
              <input v-model="loginEmail" type="email" class="login-field__input" placeholder="Email Address" @keydown.enter="handleLogin" />
            </div>
          </div>
          <div class="login-field">
            <div class="login-field__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div class="login-field__input-wrap">
              <input v-model="loginPass" type="password" class="login-field__input" placeholder="Password" @keydown.enter="handleLogin" />
            </div>
          </div>
          <button class="login-btn" @click="handleLogin" :disabled="loginLoading">
            <span v-if="loginLoading" class="spinner"></span>
            {{ loginLoading ? 'Signing in...' : 'Login' }}
          </button>
          <p class="login-card__hint">Use your Firebase Auth credentials to sign in</p>
        </div>
      </div>
    </div>

    <div v-else class="admin-layout-inner">
      <aside class="sidebar">
        <div class="sidebar__brand">
          <img src="@/assets/Halote logo white-02.svg" alt="Halotel" class="h-6 w-auto mb-1" />
          <span class="sidebar__label">ADMIN PANEL</span>
        </div>

        <nav class="sidebar__nav">
          <a class="sidebar__item" :class="{ 'sidebar__item--active': activeTab === 'dashboard' }" @click="activeTab = 'dashboard'">
            <LayoutDashboard class="w-4 h-4" />Dashboard
          </a>
          <a class="sidebar__item" :class="{ 'sidebar__item--active': activeTab === 'prizes' }" @click="activeTab = 'prizes'">
            <Gift class="w-4 h-4" />Prize Management
          </a>
          <a class="sidebar__item" :class="{ 'sidebar__item--active': activeTab === 'winners' }" @click="activeTab = 'winners'">
            <Trophy class="w-4 h-4" />
            Participants
            <span v-if="winners.length" class="sidebar__badge">{{ winners.length }}</span>
          </a>
          <a class="sidebar__item" :class="{ 'sidebar__item--active': activeTab === 'admin' }" @click="activeTab = 'admin'">
            <Shield class="w-4 h-4" />Admin Management
          </a>
        </nav>

        <div class="sidebar__footer">
          <button @click="handleLogout" class="btn btn-ghost w-full">
            <LogOut class="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="admin-main">
        <!-- Topbar -->
        <header class="admin-topbar">
          <div>
            <h1 class="admin-topbar__title">
              {{ activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'prizes' ? 'Prize Management' : activeTab === 'winners' ? 'Participants' : 'Admin Management' }}
            </h1>
            <p class="admin-topbar__subtitle">
              {{ activeTab === 'dashboard' ? 'Real-time overview of your Spin & Win event' : activeTab === 'prizes' ? 'Configure prizes, rarity, and stock' : activeTab === 'winners' ? 'Everyone who played — winners and non-winners' : 'Manage admin panel users' }}
            </p>
          </div>
          <div v-if="activeTab === 'prizes'" style="display:flex;gap:10px">
            <button @click="resetDefaults" class="btn btn-outline btn-sm" style="color:#dc2626;border-color:#fecaca">Reset Defaults</button>
            <button @click="openAdd" class="btn btn-primary"><Plus class="w-4 h-4" />Add Prize</button>
          </div>
          <div v-if="activeTab === 'winners'" style="display:flex;gap:10px">
            <button @click="exportWinnersCSV" class="btn btn-outline btn-sm"><Download class="w-4 h-4" />Export CSV</button>
          </div>
          <div v-if="activeTab === 'admin'">
            <button @click="openAddAdmin" class="btn btn-primary"><Plus class="w-4 h-4" />New User</button>
          </div>
        </header>

        <div class="admin-content">
          <!-- ═══ DASHBOARD ═══ -->
          <div v-if="activeTab === 'dashboard'">
          <div class="dashboard-stats">
            <div v-for="s in stats" :key="s.label" class="stat-card">
              <div class="stat-card__icon" :style="{ backgroundColor: s.bg, color: s.color }">
                <component :is="s.icon" class="w-5 h-5" />
              </div>
              <div class="stat-card__value" :style="{ color: s.color }">{{ s.value }}</div>
              <div class="stat-card__label">{{ s.label }}</div>
            </div>
          </div>
          <div class="card" style="margin-top: 24px;">
            <div style="padding: 20px 24px; border-bottom: 1px solid var(--slate-200); display: flex; justify-content: space-between; align-items: center;">
              <h3 style="font-size: 16px; font-weight: 700; color: var(--slate-800);">Prize Overview</h3>
              <span class="badge badge--orange">{{ prizes.length }} items</span>
            </div>
            <div style="overflow-x: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Prize</th>
                    <th>Rarity</th>
                    <th>Win Chance</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="prize in prizes" :key="prize.id">
                    <td>
                      <div class="flex items-center gap-3">
                        <div class="prize-thumb">
                          <img v-if="getPrizeThumb(prize)" :src="getPrizeThumb(prize)!" :alt="prize.name" class="w-full h-full object-contain" />
                          <Gift v-else class="w-4 h-4" :style="{ color: prize.color }" />
                        </div>
                        <div>
                          <div class="font-semibold" style="color: var(--slate-800); font-size: 14px;">{{ prize.name }}</div>
                          <div style="font-size:11px;color:var(--slate-400)">{{ prize.claimable ? 'Claimable' : 'No claim' }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="rarity-tag" :style="{ background: rarityColor(prize.rarity ?? 3) + '18', color: rarityColor(prize.rarity ?? 3), borderColor: rarityColor(prize.rarity ?? 3) + '40' }">
                        {{ rarityLabel(prize.rarity ?? 3) }} · {{ prize.rarity ?? 3 }}/10
                      </span>
                    </td>
                    <td>
                      <div class="flex items-center gap-2">
                        <div class="progress-bar" style="width: 64px;">
                          <div class="progress-bar__fill" :style="{ width: Math.min(computeProbability(prize, prizes), 100) + '%' }"></div>
                        </div>
                        <span style="font-weight:700;font-size:13px;color:var(--slate-700)">{{ computeProbability(prize, prizes).toFixed(1) }}%</span>
                      </div>
                    </td>
                    <td><span style="font-weight: 600; font-size: 14px; color: var(--slate-700);">{{ prize.quantity ?? '∞' }}</span></td>
                  </tr>
                  <tr v-if="prizes.length === 0">
                    <td colspan="4" style="text-align: center; padding: 40px; color: var(--slate-400);">No prizes configured.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ═══ PRIZE MANAGEMENT ═══ -->
        <div v-if="activeTab === 'prizes'">
          <div class="card">
            <div style="overflow-x: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Thumbnail</th>
                    <th>Prize</th>
                    <th>Swahili</th>
                    <th>Rarity</th>
                    <th>Win Chance</th>
                    <th>Stock</th>
                    <th style="text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="prize in prizes" :key="prize.id">
                    <td>
                      <div class="prize-thumb">
                        <img v-if="getPrizeThumb(prize)" :src="getPrizeThumb(prize)!" :alt="prize.name" class="w-full h-full object-contain" />
                        <Gift v-else class="w-4 h-4" :style="{ color: prize.color }" />
                      </div>
                    </td>
                    <td>
                      <div class="font-semibold" style="color: var(--slate-800); font-size: 14px;">{{ prize.name }}</div>
                      <div v-if="prize.amount" class="text-xs" style="color: var(--orange); font-weight: 700;">TZS {{ prize.amount }}</div>
                    </td>
                    <td><span style="font-size: 13px; color: var(--slate-500);">{{ prize.swahiliName }}</span></td>
                    <td>
                      <span class="rarity-tag" :style="{ background: rarityColor(prize.rarity ?? 3) + '18', color: rarityColor(prize.rarity ?? 3), borderColor: rarityColor(prize.rarity ?? 3) + '40' }">
                        {{ rarityLabel(prize.rarity ?? 3) }} {{ prize.rarity ?? 3 }}/10
                      </span>
                    </td>
                    <td>
                      <div class="flex items-center gap-2">
                        <div class="progress-bar" style="width: 52px;">
                          <div class="progress-bar__fill" :style="{ width: Math.min(computeProbability(prize, prizes), 100) + '%' }"></div>
                        </div>
                        <span style="font-weight:700;font-size:12px;color:var(--slate-700)">{{ computeProbability(prize, prizes).toFixed(1) }}%</span>
                      </div>
                    </td>
                    <td><span style="font-weight: 600; font-size: 14px; color: var(--slate-700);">{{ prize.quantity ?? '∞' }}</span></td>
                    <td>
                      <div class="flex gap-2 justify-end">
                        <button @click="openEdit(prize)" class="btn btn-sm btn-edit"><Pencil class="w-3.5 h-3.5" /></button>
                        <button @click="confirmDelete(prize.id)" class="btn btn-sm btn-delete"><Trash2 class="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="prizes.length === 0">
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--slate-400);">No prizes yet. Click "Add Prize" to create one.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ═══ PARTICIPANTS / SPINS ═══ -->
        <div v-if="activeTab === 'winners'">
          <!-- Filter bar -->
          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button
              v-for="opt in [{ v:'all', l:'All Participants' }, { v:'winners', l:'Winners Only' }]" :key="opt.v"
              @click="spinsFilter = opt.v as 'all' | 'winners'"
              class="btn btn-sm"
              :class="spinsFilter === opt.v ? 'btn-primary' : 'btn-outline'"
            >{{ opt.l }}</button>
            <span style="margin-left:auto;font-size:12px;color:var(--slate-400);align-self:center;">
              {{ filteredSpins.length }} record{{ filteredSpins.length !== 1 ? 's' : '' }}
            </span>
          </div>

          <div class="card">
            <div style="overflow-x: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Phone</th>
                    <th>Result</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="w in filteredSpins" :key="w.id">
                    <td>
                      <div class="flex items-center gap-3">
                        <div class="winner-avatar" :style="{ background: genderColor(w.gender) }">{{ w.name.charAt(0).toUpperCase() }}</div>
                        <div>
                          <div style="font-weight:700;font-size:14px;color:var(--slate-800)">{{ w.name }}</div>
                          <div style="font-size:11px;color:var(--slate-400)">{{ w.gender }}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style="font-size:13px;color:var(--slate-600);font-weight:600">{{ w.phone }}</span></td>
                    <td>
                      <div v-if="w.prizeName" class="flex items-center gap-2">
                        <span
                          class="badge"
                          :style="w.isClaimable
                            ? 'background:rgba(34,197,94,0.12);color:#16a34a;border:1px solid rgba(34,197,94,0.25)'
                            : 'background:rgba(100,116,139,0.12);color:#64748b;border:1px solid rgba(100,116,139,0.2)'"
                        >{{ w.isClaimable ? '🏆 WIN' : '🔄 NO WIN' }}</span>
                        <span style="font-size:13px;font-weight:600;color:var(--slate-700)">{{ w.prizeName }}</span>
                      </div>
                      <span v-else style="font-size:12px;color:var(--slate-400)">Spinning…</span>
                    </td>
                    <td><span style="font-size:12px;color:var(--slate-500)">{{ formatDate(w.timestamp) }}</span></td>
                  </tr>
                  <tr v-if="filteredSpins.length === 0">
                    <td colspan="4" style="text-align:center;padding:60px;color:var(--slate-400)">
                      <div style="font-size:40px;margin-bottom:12px">📋</div>
                      <div style="font-weight:700;font-size:15px;margin-bottom:4px">No records yet</div>
                      <div style="font-size:13px">Participants will appear here once they spin</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ═══ ADMIN MANAGEMENT ═══ -->
        <div v-if="activeTab === 'admin'">
            <div class="card">
              <div style="overflow-x: auto;">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th style="text-align: right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="user in adminUsers" :key="user.id">
                      <td><span style="font-weight: 700; color: var(--slate-800); font-size: 14px;">{{ user.name }}</span></td>
                      <td><span style="color: var(--slate-400); font-size: 12px;">{{ user.email }}</span></td>
                      <td><span class="badge badge--orange" style="text-transform: capitalize;">{{ user.role }}</span></td>
                      <td><span class="status-badge" :class="user.status === 'active' ? 'status-badge--active' : 'status-badge--draft'">{{ user.status === 'active' ? 'Active' : 'Disabled' }}</span></td>
                      <td>
                        <div class="flex gap-2 justify-end">
                          <button class="btn btn-sm btn-outline" :style="{ borderColor: 'var(--slate-200)', color: 'var(--slate-600)' }" @click="toggleAdminStatus(user)" :disabled="user.id === currentAdmin?.id">{{ user.status === 'active' ? 'Disable' : 'Enable' }}</button>
                          <button class="btn btn-sm btn-edit" @click="openEditAdmin(user)">Edit</button>
                          <button class="btn btn-sm btn-delete" @click="confirmDeleteAdmin(user.id)" :disabled="user.id === currentAdmin?.id"><Trash2 class="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Add/Edit Prize Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content" style="max-width: 540px;">
        <div class="flex items-center justify-between mb-6">
          <h3 style="font-size: 18px; font-weight: 800; color: var(--slate-800);">{{ editingPrize ? 'Edit Prize' : 'Add Prize' }}</h3>
          <button @click="showModal = false" style="background: none; border: none; cursor: pointer; color: var(--slate-400);"><X class="w-5 h-5" /></button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Name (English)</label>
            <input v-model="form.name" class="input" placeholder="Voucher 5,000" />
          </div>
          <div>
            <label class="label">Name (Swahili)</label>
            <input v-model="form.swahiliName" class="input" placeholder="VOUCHER 5,000" />
          </div>
          <div>
            <label class="label">Stock / Quantity (empty = ∞)</label>
            <input v-model.number="form.quantity" type="number" class="input input--mono" placeholder="∞" />
          </div>
          <div>
            <label class="label">Amount (optional, e.g. 5,000)</label>
            <input v-model="form.amount" class="input" placeholder="5,000" />
          </div>
        </div>

        <!-- Rarity Slider -->
        <div class="mt-4">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <label class="label" style="margin:0">Rarity</label>
            <div style="display:flex;align-items:center;gap:10px">
              <span class="rarity-tag" :style="{ background: rarityColor(form.rarity) + '18', color: rarityColor(form.rarity), borderColor: rarityColor(form.rarity) + '44' }">
                {{ rarityLabel(form.rarity) }} · {{ form.rarity }}/10
              </span>
              <span class="prob-preview-chip">~{{ probPreview }}% chance</span>
            </div>
          </div>
          <input
            type="range" v-model.number="form.rarity" min="1" max="10" step="1"
            class="rarity-slider"
            :style="{ '--rc': rarityColor(form.rarity) }"
          />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;font-weight:600;margin-top:4px">
            <span>1 · Common</span><span>5 · Rare</span><span>10 · Legendary</span>
          </div>
        </div>

        <!-- Claimable Toggle -->
        <div class="mt-4 claimable-row">
          <label class="toggle-switch">
            <input type="checkbox" v-model="form.claimable" />
            <span class="toggle-thumb"></span>
          </label>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--slate-800)">Collect winner details</div>
            <div style="font-size:11px;color:var(--slate-400)">Show name/phone/gender form when this prize is won</div>
          </div>
        </div>
        <!-- Thumbnail Upload -->
        <div class="mt-4">
          <label class="label">Prize Thumbnail</label>
          <div class="thumbnail-upload" @click="(e) => (e.currentTarget as HTMLElement)?.querySelector('input')?.click()">
            <input type="file" accept="image/*" @change="handleThumbnailUpload" style="display: none;" />
            <div v-if="thumbnailPreview" class="thumbnail-preview">
              <img :src="thumbnailPreview" alt="Thumbnail" class="w-full h-full object-contain" />
              <button class="thumbnail-remove" @click.stop="thumbnailPreview = null; form.thumbnail = ''"><X class="w-3 h-3" /></button>
            </div>
            <div v-else class="thumbnail-placeholder">
              <Upload class="w-6 h-6" />
              <span>Click to upload thumbnail</span>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showModal = false" class="btn btn-outline">Cancel</button>
          <button @click="save" class="btn btn-primary">{{ editingPrize ? 'Save Changes' : 'Add Prize' }}</button>
        </div>
      </div>
    </div>

    <!-- Delete Prize Confirm -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = null">
      <div class="modal-content" style="max-width: 400px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3 style="font-size: 18px; font-weight: 800; color: var(--slate-800); margin-bottom: 8px;">Delete Prize?</h3>
        <p style="color: var(--slate-500); font-size: 14px; margin-bottom: 24px;">This action cannot be undone.</p>
        <div class="flex justify-center gap-3">
          <button @click="showDeleteConfirm = null" class="btn btn-outline">Cancel</button>
          <button @click="executeDelete" class="btn btn-danger">Delete</button>
        </div>
      </div>
    </div>

    <!-- Admin User Modal -->
    <div v-if="showAdminModal" class="modal-overlay" @click.self="showAdminModal = false">
      <div class="modal-content" style="max-width: 480px;">
        <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 800; color: var(--slate-800);">{{ editingAdminId ? 'Edit User' : 'Add New User' }}</h3>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label class="label">Full Name <span style="color: var(--orange)">*</span></label>
            <input v-model="adminForm.name" class="input" placeholder="John Doe" />
          </div>
          <div>
            <label class="label">Email <span style="color: var(--orange)">*</span></label>
            <input v-model="adminForm.email" type="email" class="input" :disabled="!!editingAdminId" placeholder="john@halotel.com" />
          </div>
          <div>
            <label class="label">Password <span v-if="!editingAdminId" style="color: var(--orange)">*</span> <span style="font-size: 11px; color: var(--slate-400);">(Min. 6 chars)</span></label>
            <input v-model="adminForm.password" type="password" class="input" :placeholder="editingAdminId ? 'Leave empty to keep current' : 'Enter secure password'" />
          </div>
          <div>
            <label class="label">Role <span style="color: var(--orange)">*</span></label>
            <select v-model="adminForm.role" class="input select">
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 28px;">
          <button class="btn btn-primary" style="flex: 1;" @click="saveAdmin">{{ editingAdminId ? 'Save Changes' : 'Add User' }}</button>
          <button class="btn btn-outline" @click="showAdminModal = false">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Delete Admin Confirm -->
    <div v-if="deletingAdminId" class="modal-overlay" @click.self="deletingAdminId = null">
      <div class="modal-content" style="max-width: 400px;">
        <h3 style="margin: 0 0 12px; font-size: 17px; font-weight: 800; color: var(--slate-800);">Delete User</h3>
        <p style="font-size: 14px; color: var(--slate-600); margin-bottom: 12px;">Are you sure you want to delete this user?</p>
        <p style="font-size: 13px; color: #dc2626; font-weight: 600; margin-bottom: 20px; padding: 10px 14px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">This will permanently revoke their access.</p>
        <div class="flex gap-3 justify-end">
          <button class="btn btn-outline" @click="deletingAdminId = null">Cancel</button>
          <button class="btn btn-danger" @click="executeDeleteAdmin">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-layout { display: flex; min-height: calc(100vh - 56px); background: #fafaf8; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
.admin-layout-inner { display: flex; flex: 1; min-width: 0; }

/* ── Sidebar ────────────────────────────────────────────────────────── */
.sidebar { width: 240px; background: #1e293b; display: flex; flex-direction: column; flex-shrink: 0; position: sticky; top: 56px; height: calc(100vh - 56px); }
.sidebar__brand { padding: 24px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.sidebar__label { font-size: 10px; font-weight: 800; letter-spacing: 2px; color: rgba(255,255,255,0.35); text-transform: uppercase; }
.sidebar__nav { padding: 12px; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.sidebar__item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.55); text-decoration: none; transition: all 0.2s; cursor: pointer; }
.sidebar__item:hover { color: white; background: rgba(255,255,255,0.06); }
.sidebar__item--active { color: white; background: rgba(255,69,0,0.15); }
.sidebar__footer { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.06); }

/* ── Admin Main ─────────────────────────────────────────────────────── */
.admin-main { flex: 1; overflow: auto; min-width: 0; }
.login-center { display: flex; align-items: center; justify-content: center; padding: 40px 24px; background: #fafaf8; }
.admin-topbar { background: white; border-bottom: 1px solid #e2e8f0; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; }
.admin-topbar__title { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; }
.admin-topbar__subtitle { font-size: 13px; color: #64748b; margin: 2px 0 0; }
.admin-content { padding: 24px 32px; }

/* ── Stats ──────────────────────────────────────────────────────────── */
.dashboard-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
.stat-card { background: white; border-radius: 16px; padding: 20px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); transition: all 0.2s; cursor: default; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
.stat-card__icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.stat-card__value { font-size: 28px; font-weight: 900; line-height: 1; margin-bottom: 4px; }
.stat-card__label { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

/* ── Card ───────────────────────────────────────────────────────────── */
.card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }

/* ── Table ──────────────────────────────────────────────────────────── */
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 12px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.data-table tbody tr:hover { background: #f8fafc; }
.prize-thumb { width: 40px; height: 40px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }

/* ── Badges ─────────────────────────────────────────────────────────── */
.badge { display: inline-flex; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
.badge--orange { background: #FFF0EB; color: #FF4500; }
.badge--green { background: #f0fdf4; color: #16a34a; }
.badge--amber { background: #fef3c7; color: #d97706; }
.status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; }
.status-badge--active { background: #f0fdf4; color: #16a34a; }
.status-badge--draft { background: #fef2f2; color: #dc2626; }

/* ── Progress ───────────────────────────────────────────────────────── */
.progress-bar { height: 6px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
.progress-bar__fill { height: 100%; background: linear-gradient(90deg, #FF4500, #FF6A33); border-radius: 99px; transition: width 0.3s; }

/* ── Buttons ────────────────────────────────────────────────────────── */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; white-space: nowrap; }
.btn-sm { padding: 6px 10px; border-radius: 8px; font-size: 12px; }
.btn-primary { background: linear-gradient(180deg, #FF4500, #E03E00); color: white; box-shadow: 0 4px 16px rgba(255,69,0,0.25); }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(255,69,0,0.35); }
.btn-outline { background: white; color: #1e293b; border: 1.5px solid #e2e8f0; }
.btn-outline:hover { border-color: #FF4500; color: #FF4500; }
.btn-danger { background: #dc2626; color: white; }
.btn-danger:hover { background: #b91c1c; }
.btn-edit { background: #f0fdf4; color: #16a34a; }
.btn-edit:hover { background: #dcfce7; }
.btn-delete { background: #fef2f2; color: #dc2626; }
.btn-delete:hover { background: #fecaca; }
.btn-ghost { background: transparent; color: rgba(255,255,255,0.6); padding: 8px 14px; border-radius: 8px; font-size: 13px; }
.btn-ghost:hover { background: rgba(255,255,255,0.06); color: white; }

/* ── Inputs ─────────────────────────────────────────────────────────── */
.input { width: 100%; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 14px; color: #1e293b; background: white; outline: none; transition: all 0.2s; box-sizing: border-box; }
.input:focus { border-color: #FF4500; box-shadow: 0 0 0 3px rgba(255,69,0,0.1); }
.input--mono { font-family: 'SF Mono', 'Fira Code', monospace; font-weight: 600; }
.select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; }
.label { display: block; font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }

/* ── Modal ──────────────────────────────────────────────────────────── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; animation: fadeInOverlay 0.2s ease; }
.modal-content { background: white; border-radius: 24px; padding: 32px; width: 90%; box-shadow: 0 24px 64px rgba(0,0,0,0.2); animation: scaleIn 0.25s ease; }

/* ── Thumbnail Upload ───────────────────────────────────────────────── */
.thumbnail-upload { border: 2px dashed #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s; }
.thumbnail-upload:hover { border-color: #FF4500; background: #FFF0EB; }
.thumbnail-preview { position: relative; width: 100%; height: 100px; display: flex; align-items: center; justify-content: center; }
.thumbnail-preview img { max-width: 100%; max-height: 100px; object-fit: contain; }
.thumbnail-remove { position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; border-radius: 50%; background: #dc2626; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.thumbnail-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #94a3b8; font-size: 13px; font-weight: 500; }

/* ── Login ──────────────────────────────────────────────────────────── */
.login-page { max-width: 420px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }
.login-header { width: 100%; background: linear-gradient(135deg, #F26522, #E85A18); padding: 32px 24px 64px; text-align: center; position: relative; overflow: hidden; border-radius: 20px 20px 0 0; }
.login-header__bg-shapes { position: absolute; inset: 0; pointer-events: none; }
.login-header__circle { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.06); }
.login-header__circle--1 { width: 300px; height: 300px; top: -100px; right: -80px; }
.login-header__circle--2 { width: 200px; height: 200px; bottom: -60px; left: -40px; }
.login-header__content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
.login-header__subtitle { color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px; }
.login-card { background: white; border-radius: 24px; padding: 32px 28px; width: 100%; margin-top: -40px; position: relative; z-index: 10; box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08); }
.login-card__title { text-align: center; font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 24px; }
.login-card__error { display: flex; align-items: center; gap: 8px; background: #fef2f2; color: #dc2626; padding: 10px 14px; border-radius: 12px; margin-bottom: 16px; font-size: 13px; font-weight: 500; border: 1px solid #fecaca; }
.login-field { display: flex; align-items: center; gap: 12px; border: 2px solid #e8ecf4; border-radius: 14px; padding: 0 16px; margin-bottom: 14px; transition: border-color 0.25s ease, box-shadow 0.25s ease; background: white; }
.login-field:focus-within { border-color: #F26522; box-shadow: 0 0 0 4px rgba(242,101,34,0.1); }
.login-field__icon { flex-shrink: 0; display: flex; align-items: center; }
.login-field__input-wrap { flex: 1; position: relative; padding: 8px 0; }
.login-field__input { width: 100%; border: none; outline: none; font-size: 15px; font-family: 'Inter', system-ui, sans-serif; color: #1e293b; background: transparent; padding: 14px 0 4px; font-weight: 500; }
.login-btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #F26522, #E85A18); color: white; border: none; border-radius: 14px; font-size: 17px; font-weight: 700; cursor: pointer; margin-top: 8px; transition: all 0.25s ease; box-shadow: 0 4px 16px rgba(242,101,34,0.35); display: flex; align-items: center; justify-content: center; gap: 8px; }
.login-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(242,101,34,0.5); }
.login-btn:disabled { opacity: 0.8; cursor: not-allowed; transform: none; }
.login-card__hint { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 16px; padding: 10px; background: #f8fafc; border-radius: 10px; font-weight: 500; }

/* ── Spinner ────────────────────────────────────────────────────────── */
.spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: white; border-right-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* ── Rarity ──────────────────────────────────────────────────────────── */
.rarity-tag {
  display: inline-flex; padding: 3px 10px; border-radius: 99px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
  border: 1px solid; white-space: nowrap;
}
.rarity-slider {
  -webkit-appearance: none; width: 100%; height: 6px; border-radius: 3px; outline: none; cursor: pointer;
  background: linear-gradient(to right, #22c55e 0%, #22c55e 10%, #86efac 20%, #eab308 40%, #f97316 60%, #ef4444 80%, #a855f7 100%);
}
.rarity-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
  background: white; border: 3px solid var(--rc, #F26522); cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2); transition: border-color 0.2s;
}
.rarity-slider::-moz-range-thumb {
  width: 20px; height: 20px; border-radius: 50%;
  background: white; border: 3px solid var(--rc, #F26522); cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.prob-preview-chip {
  font-size: 12px; font-weight: 700; color: #FF4500;
  background: #FFF0EB; padding: 3px 10px; border-radius: 99px;
  border: 1px solid #ffe0d0;
}

/* ── Claimable toggle ────────────────────────────────────────────────── */
.claimable-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; background: #f8fafc; border: 1.5px solid #e2e8f0; }
.toggle-switch { position: relative; width: 44px; height: 24px; cursor: pointer; flex-shrink: 0; }
.toggle-switch input { display: none; }
.toggle-thumb { position: absolute; inset: 0; background: #e2e8f0; border-radius: 12px; transition: all 0.2s; }
.toggle-thumb::after { content: ''; position: absolute; width: 18px; height: 18px; background: white; border-radius: 50%; top: 3px; left: 3px; transition: all 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
.toggle-switch input:checked + .toggle-thumb { background: #F26522; }
.toggle-switch input:checked + .toggle-thumb::after { transform: translateX(20px); }

/* ── Winners ─────────────────────────────────────────────────────────── */
.winner-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 800; font-size: 15px; flex-shrink: 0;
}

/* ── Sidebar badge ───────────────────────────────────────────────────── */
.sidebar__badge {
  margin-left: auto; background: #FF4500; color: white;
  font-size: 10px; font-weight: 800; padding: 2px 6px;
  border-radius: 99px; line-height: 1.4;
}
</style>

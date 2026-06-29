import { ref, computed } from 'vue'
import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, query, orderBy, writeBatch, getDocs
} from 'firebase/firestore'
import { db } from '../firebase'

export type PrizeType = 'win' | 'retry' | 'thanks'

export interface Prize {
  id: string
  name: string
  swahiliName: string
  color: string
  rarity: number       // 1 (Common) – 10 (Legendary)
  quantity: number | null
  prizeType: PrizeType // 'win' | 'retry' | 'thanks'
  claimable: boolean   // derived: prizeType === 'win'
  amount?: string | null
  subtitle?: string | null
  thumbnail?: string | null
  order: number
}

// weight = stock / rarity^1.5  →  more stock + lower rarity = more winnable
export function computeWeight(prize: Prize): number {
  const qty = prize.quantity ?? 50
  return qty / Math.pow(prize.rarity, 1.5)
}

export function computeProbability(prize: Prize, prizes: Prize[]): number {
  const total = prizes.reduce((s, p) => s + computeWeight(p), 0)
  if (total === 0) return 0
  return (computeWeight(prize) / total) * 100
}

export function rarityLabel(r: number): string {
  if (r <= 2) return 'Common'
  if (r <= 4) return 'Uncommon'
  if (r <= 6) return 'Rare'
  if (r <= 8) return 'Epic'
  return 'Legendary'
}

export function rarityColor(r: number): string {
  if (r <= 2) return '#22c55e'
  if (r <= 4) return '#eab308'
  if (r <= 6) return '#f97316'
  if (r <= 8) return '#ef4444'
  return '#a855f7'
}

const defaultPrizes: Prize[] = [
  { id: 'voucher_5000', name: 'Voucher 5,000',          swahiliName: 'VOUCHER 5,000',      color: '#F26522', rarity: 4, quantity: 100,  prizeType: 'win',    claimable: true,  amount: '5,000', order: 0 },
  { id: 'jaribu',       name: 'Jaribu Tena',             swahiliName: 'JARIBU TENA',        color: '#DC3545', rarity: 4, quantity: null, prizeType: 'retry',  claimable: false, order: 1 },
  { id: 'voucher_2000', name: 'Voucher 2,000',          swahiliName: 'VOUCHER 2,000',      color: '#F5B800', rarity: 5, quantity: 50,   prizeType: 'win',    claimable: true,  amount: '2,000', order: 2 },
  { id: 'cap',          name: 'Cap / Kofia',             swahiliName: 'CAP / KOFIA',        color: '#007BFF', rarity: 6, quantity: 33,   prizeType: 'win',    claimable: true,  order: 3 },
  { id: 'bracelets',    name: 'Bracelets',               swahiliName: 'BRACELETS',          color: '#555555', rarity: 2, quantity: 375,  prizeType: 'win',    claimable: true,  order: 4 },
  { id: 'pen',          name: 'Pen',                     swahiliName: 'PEN',                color: '#17A2B8', rarity: 2, quantity: 60,   prizeType: 'win',    claimable: true,  order: 5 },
  { id: 'key_holder',   name: 'Key Holder',              swahiliName: 'KEY HOLDER',         color: '#28A745', rarity: 2, quantity: 65,   prizeType: 'win',    claimable: true,  order: 6 },
  { id: 'voucher_500',  name: 'Voucher 500',             swahiliName: 'VOUCHER 500',        color: '#8B2F8B', rarity: 3, quantity: 100,  prizeType: 'win',    claimable: true,  amount: '500', order: 7 },
  { id: 'ahsante',      name: 'Ahsante kwa Kushiriki',   swahiliName: 'AHSANTE KWA KUSHIRIKI', color: '#6C757D', rarity: 3, quantity: null, prizeType: 'thanks', claimable: false, order: 8 },
]

const COLORS = ['#F26522','#DC3545','#F5B800','#007BFF','#555555','#17A2B8','#8B2F8B','#6C757D','#28A745','#FF6B9D','#FFD700','#E83E8C']
let colorIndex = 0
function nextColor(): string {
  const c = COLORS[colorIndex % COLORS.length]; colorIndex++; return c
}

const prizes = ref<Prize[]>([])
const loading = ref(true)
let initialized = false

function initStore() {
  if (initialized) return
  initialized = true
  const q = query(collection(db, 'prizes'), orderBy('order'))
  onSnapshot(q, async (snap) => {
    if (snap.empty) {
      const batch = writeBatch(db)
      defaultPrizes.forEach(p => batch.set(doc(db, 'prizes', p.id), p))
      await batch.commit()
      return
    }
    const loaded = snap.docs.map(d => d.data() as Prize)
    // Auto-migrate prizes missing rarity or prizeType (old schema)
    const needsMigration = loaded.some(p => p.rarity === undefined || p.rarity === null || p.prizeType === undefined)
    if (needsMigration) {
      const batch = writeBatch(db)
      snap.docs.forEach(d => batch.delete(d.ref))
      defaultPrizes.forEach(p => batch.set(doc(db, 'prizes', p.id), p))
      await batch.commit()
      // onSnapshot will fire again with fresh migrated data
      return
    }
    prizes.value = loaded
    loading.value = false
  })
}
initStore()

async function addPrize(prize: Omit<Prize, 'id' | 'color' | 'order'>) {
  const id = 'prize_' + Date.now()
  await setDoc(doc(db, 'prizes', id), { ...prize, id, color: nextColor(), order: prizes.value.length })
}

async function updatePrize(id: string, updates: Partial<Prize>) {
  await setDoc(doc(db, 'prizes', id), updates, { merge: true })
}

async function deletePrize(id: string) {
  await deleteDoc(doc(db, 'prizes', id))
}

async function resetDefaults() {
  const batch = writeBatch(db)
  ;(await getDocs(collection(db, 'prizes'))).docs.forEach(d => batch.delete(d.ref))
  defaultPrizes.forEach(p => batch.set(doc(db, 'prizes', p.id), p))
  await batch.commit()
}

const totalQuantity = computed(() => prizes.value.reduce((s, p) => s + (p.quantity || 0), 0))

export function usePrizeStore() {
  return {
    prizes: computed(() => prizes.value),
    totalQuantity,
    loading: computed(() => loading.value),
    addPrize, updatePrize, deletePrize, resetDefaults,
  }
}

import { reactive, computed } from 'vue'

export interface Prize {
  id: string
  name: string
  swahiliName: string
  color: string
  probability: number
  quantity: number | null
  type: 'prize' | 'thanks' | 'retry'
  amount?: string
  subtitle?: string
  thumbnail?: string
}

const defaultPrizes: Prize[] = [
  { id: 'voucher_5000', name: 'Voucher 5,000', swahiliName: 'VOUCHER 5,000', color: '#F26522', probability: 15.4, quantity: 100, type: 'prize', amount: '5,000' },
  { id: 'jaribu', name: 'Jaribu Tena', swahiliName: 'JARIBU 1,000', color: '#DC3545', probability: 7.7, quantity: null, type: 'retry', amount: '1,000', subtitle: 'TENA' },
  { id: 'voucher_2000', name: 'Voucher 2,000', swahiliName: 'VOUCHER 2,000', color: '#F5B800', probability: 7.7, quantity: 50, type: 'prize', amount: '2,000' },
  { id: 'cap', name: 'Cap / Kofia', swahiliName: 'CAP / KOFIA', color: '#007BFF', probability: 5.1, quantity: 33, type: 'prize' },
  { id: 'bracelets', name: 'Bracelets', swahiliName: 'BRACELETS', color: '#555555', probability: 57.7, quantity: 375, type: 'prize' },
  { id: 'pen_keyholder', name: 'Pen + Key Holder', swahiliName: 'PEN + KEY HOLDER', color: '#17A2B8', probability: 19.2, quantity: 125, type: 'prize' },
  { id: 'voucher_500', name: 'Voucher 500', swahiliName: 'VOUCHER 500', color: '#8B2F8B', probability: 15.4, quantity: 100, type: 'prize', amount: '500' },
  { id: 'ahsante', name: 'Ahsante kwa Kushiriki', swahiliName: 'AHSANTE KWA KUSHIKI', color: '#6C757D', probability: 12.8, quantity: null, type: 'thanks' },
]

const COLORS = ['#F26522', '#DC3545', '#F5B800', '#007BFF', '#555555', '#17A2B8', '#8B2F8B', '#6C757D', '#28A745', '#FF6B9D', '#FFD700', '#E83E8C']

let colorIndex = 0
function nextColor(): string {
  const c = COLORS[colorIndex % COLORS.length]
  colorIndex++
  return c
}

const saved = localStorage.getItem('halotel_prizes')
const state = reactive<{ prizes: Prize[] }>({
  prizes: saved ? JSON.parse(saved) : [...defaultPrizes],
})

function save() {
  localStorage.setItem('halotel_prizes', JSON.stringify(state.prizes))
}

function resetDefaults() {
  state.prizes = [...defaultPrizes]
  save()
}

function addPrize(prize: Omit<Prize, 'id' | 'color'>) {
  const id = 'prize_' + Date.now()
  const color = nextColor()
  state.prizes.push({ ...prize, id, color })
  save()
}

function updatePrize(id: string, updates: Partial<Prize>) {
  const idx = state.prizes.findIndex(p => p.id === id)
  if (idx !== -1) {
    state.prizes[idx] = { ...state.prizes[idx], ...updates }
    save()
  }
}

function deletePrize(id: string) {
  state.prizes = state.prizes.filter(p => p.id !== id)
  save()
}

const totalProbability = computed(() =>
  state.prizes.reduce((sum, p) => sum + p.probability, 0)
)

const totalQuantity = computed(() =>
  state.prizes.reduce((sum, p) => sum + (p.quantity || 0), 0)
)

export function usePrizeStore() {
  return {
    prizes: computed(() => state.prizes),
    totalProbability,
    totalQuantity,
    addPrize,
    updatePrize,
    deletePrize,
    resetDefaults,
  }
}

import { createRouter, createWebHistory } from 'vue-router'
import SpinPage from '@/pages/SpinPage.vue'
import AdminPage from '@/pages/AdminPage.vue'
import ParticipantsPage from '@/pages/ParticipantsPage.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',            component: SpinPage },
    { path: '/admin',       component: AdminPage },
    { path: '/washiriki',   component: ParticipantsPage },
  ],
})

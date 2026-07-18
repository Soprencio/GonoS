import { createRouter, createWebHistory } from 'vue-router'
import { authState } from '../state/auth.js'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/registro',
    name: 'register',
    component: () => import('../views/RegisterView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/clase/:id',
    name: 'class',
    component: () => import('../views/ClassView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/trabajo/:id',
    name: 'assignment',
    component: () => import('../views/AssignmentView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/trabajo/:id/nueva-entrega',
    name: 'new-submission',
    component: () => import('../views/NewSubmissionView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/entrega/:id/revisar',
    name: 'review',
    component: () => import('../views/ReviewView.vue'),
    meta: { requiresAuth: true }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !authState.isLoggedIn) {
    return next('/login')
  }
  if (to.meta.requiresGuest && authState.isLoggedIn) {
    return next('/')
  }
  next()
})

export default router

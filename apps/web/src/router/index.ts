import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { rememberRedirect } from '@/services/api'

import PublicLayout from '@/layouts/PublicLayout.vue'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: readonly string[]
    guestOnly?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      component: PublicLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/public/HomeView.vue'),
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('@/views/public/AboutView.vue'),
        },
        {
          path: 'campaigns',
          name: 'campaigns',
          component: () => import('@/views/public/CampaignsView.vue'),
        },
        {
          path: 'programs',
          name: 'programs',
          component: () => import('@/views/public/ProgramsView.vue'),
        },
        {
          path: 'campaigns/:slug',
          name: 'campaign-detail',
          component: () => import('@/views/public/CampaignDetailView.vue'),
        },
        {
          path: 'blog',
          name: 'blog',
          component: () => import('@/views/public/BlogListView.vue'),
        },
        {
          path: 'blog/:slug',
          name: 'blog-post',
          component: () => import('@/views/public/BlogPostView.vue'),
        },
        {
          path: 'contact',
          name: 'contact',
          component: () => import('@/views/public/ContactView.vue'),
        },
        {
          path: 'partnerships',
          name: 'partnerships',
          component: () => import('@/views/public/PartnershipsView.vue'),
        },
        {
          path: 'actions',
          name: 'actions',
          component: () => import('@/views/public/ActionsView.vue'),
        },
        {
          path: 'events',
          name: 'events',
          component: () => import('@/views/public/EventsView.vue'),
        },
        {
          path: 'impact',
          name: 'impact',
          component: () => import('@/views/public/ImpactView.vue'),
        },
        {
          path: 'donate/thanks',
          name: 'donate-thanks',
          component: () => import('@/views/public/DonateThanksView.vue'),
        },
      ],
    },

    {
      path: '/auth',
      component: () => import('@/layouts/AuthShell.vue'),
      children: [
        {
          path: 'login',
          name: 'login',
          meta: { guestOnly: true },
          component: () => import('@/views/auth/LoginView.vue'),
        },
        {
          path: 'register',
          name: 'register',
          meta: { guestOnly: true },
          component: () => import('@/views/auth/RegisterView.vue'),
        },
      ],
    },

    {
      path: '/dashboard',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true, roles: ['DONOR', 'SPONSOR', 'ADMIN'] },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/dashboard/DashboardHome.vue'),
        },
      ],
    },

    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
      children: [
        {
          path: '',
          name: 'admin-home',
          component: () => import('@/views/admin/AdminOverview.vue'),
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/admin/AdminUsersView.vue'),
        },
        {
          path: 'sponsors',
          name: 'admin-sponsors',
          component: () => import('@/views/admin/AdminSponsorsView.vue'),
        },
        {
          path: 'campaigns',
          name: 'admin-campaigns',
          component: () => import('@/views/admin/AdminCampaignsView.vue'),
        },
        {
          path: 'blog',
          name: 'admin-blog',
          component: () => import('@/views/admin/AdminBlogView.vue'),
        },
        {
          path: 'media',
          name: 'admin-media',
          component: () => import('@/views/admin/AdminMediaView.vue'),
        },
        {
          path: 'actions',
          name: 'admin-actions',
          component: () => import('@/views/admin/AdminActionsView.vue'),
        },
        {
          path: 'events',
          name: 'admin-events',
          component: () => import('@/views/admin/AdminEventsView.vue'),
        },
        {
          path: 'partnerships',
          name: 'admin-partnerships',
          component: () => import('@/views/admin/AdminPartnershipsView.vue'),
        },
        {
          path: 'impact',
          name: 'admin-impact',
          component: () => import('@/views/admin/AdminImpactView.vue'),
        },
      ],
    },

    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.bootstrapped) await auth.hydrate()

  if (auth.isAdmin && (to.path === '/dashboard' || to.path.startsWith('/dashboard/'))) {
    return { path: '/admin' }
  }

  if (to.meta.guestOnly && auth.isAuthed) {
    return auth.isAdmin ? '/admin' : '/dashboard'
  }

  if (!to.meta.requiresAuth) return true

  if (!auth.isAuthed) {
    rememberRedirect(to)
    return {
      name: 'login',
      query: {
        ...(typeof to.fullPath === 'string' ? { redirect: to.fullPath } : {}),
      },
    }
  }

  const roles = to.meta.roles
  if (roles?.length && auth.user && !(roles as readonly string[]).includes(auth.user.role)) {
    return { name: 'home' }
  }

  return true
})

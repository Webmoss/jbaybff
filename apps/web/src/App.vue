<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'

const route = useRoute()

const SITE_URL = 'https://www.jbaybff.org.za'
const DEFAULT_TITLE = 'JBay BFF'
const DEFAULT_DESCRIPTION =
  'Welcome to the Jeffreys Bay Blue Flag Foundation (JBay BFF), a non-profit organisation dedicated to serving and protecting the vibrant surfing community of Jeffreys Bay'

const staticSeo: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'JBay BFF',
    description: DEFAULT_DESCRIPTION,
  },
  '/about': {
    title: 'About · JBay BFF',
    description: 'Learn about JBay BFF and our coastal stewardship mission in Jeffreys Bay.',
  },
  '/campaigns': {
    title: 'Campaigns · JBay BFF',
    description: 'Explore active and completed Jeffreys Bay coastal campaigns and support local impact.',
  },
  '/programs': {
    title: 'Programs · JBay BFF',
    description: 'Discover JBay BFF programs focused on clean water, dunes, beach access, and community action.',
  },
  '/blog': {
    title: 'Stories · JBay BFF',
    description: 'Read latest stories, campaign updates, and conservation news from JBay BFF.',
  },
  '/contact': {
    title: 'Contact · JBay BFF',
    description: 'Get in touch with JBay BFF for volunteering, partnerships, and general enquiries.',
  },
  '/partnerships': {
    title: 'Partnerships · JBay BFF',
    description: 'Partner with JBay BFF to support practical coastal stewardship and community outcomes.',
  },
  '/shop': {
    title: 'Shop · JBay BFF',
    description: 'Support JBay BFF through branded products and campaign merchandise.',
  },
  '/actions': {
    title: 'Take Action · JBay BFF',
    description: 'Take local action for cleaner beaches, healthier oceans, and stronger coastal communities.',
  },
  '/events': {
    title: 'Events · JBay BFF',
    description: 'Join upcoming JBay BFF events, cleanups, and volunteer opportunities.',
  },
  '/impact': {
    title: 'Impact · JBay BFF',
    description: 'See measurable local impact across campaigns, events, and supporter action.',
  },
}

const seoContext = computed(() => {
  const path = route.path
  const isPrivate =
    path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/auth')

  if (isPrivate) {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonical: `${SITE_URL}${path}`,
      robots: 'noindex, nofollow',
    }
  }

  if (path.startsWith('/campaigns/')) {
    return {
      title: 'Campaign · JBay BFF',
      description: 'Campaign stewardship in Jeffreys Bay.',
      canonical: `${SITE_URL}${path}`,
      robots: 'index, follow',
    }
  }
  if (path.startsWith('/blog/')) {
    return {
      title: 'Story · JBay BFF',
      description: 'Latest coastal stewardship stories and updates from JBay BFF.',
      canonical: `${SITE_URL}${path}`,
      robots: 'index, follow',
    }
  }
  if (path.startsWith('/shop/')) {
    return {
      title: 'Product · JBay BFF',
      description: 'Support coastal stewardship through JBay BFF products.',
      canonical: `${SITE_URL}${path}`,
      robots: 'index, follow',
    }
  }

  const seo = staticSeo[path] ?? { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION }
  return {
    title: seo.title,
    description: seo.description,
    canonical: `${SITE_URL}${path}`,
    robots: 'index, follow',
  }
})

useHead(() => {
  const ctx = seoContext.value
  return {
    title: ctx.title,
    link: [{ rel: 'canonical', href: ctx.canonical }],
    meta: [
      { name: 'description', content: ctx.description },
      { name: 'robots', content: ctx.robots },
      { property: 'og:title', content: ctx.title },
      { property: 'og:description', content: ctx.description },
      { property: 'og:url', content: ctx.canonical },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:title', content: ctx.title },
      { name: 'twitter:description', content: ctx.description },
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Jeffreys Bay Blue Flag Foundation',
          alternateName: 'JBay BFF',
          url: SITE_URL,
          logo: `${SITE_URL}/Logo.png`,
        }),
      } as unknown as never,
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'JBay BFF',
          url: SITE_URL,
        }),
      } as unknown as never,
    ],
  }
})
</script>

<template>
  <RouterView />
</template>

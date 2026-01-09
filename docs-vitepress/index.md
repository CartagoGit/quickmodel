---
layout: home
---

<script setup>
import { useRouter } from 'vitepress'
import { onMounted } from 'vue'

const router = useRouter()

onMounted(() => {
  const browserLang = navigator.language.toLowerCase()
  const supportedLangs = ['en', 'es']
  
  // Check if browser language is supported
  let selectedLang = 'en' // default
  for (const lang of supportedLangs) {
    if (browserLang.startsWith(lang)) {
      selectedLang = lang
      break
    }
  }
  
  router.go(`/${selectedLang}/`)
})
</script>

# Redirecting...

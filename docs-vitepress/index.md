---
layout: home
---

<script setup>
import { useRouter, useData } from 'vitepress'
import { onMounted } from 'vue'

const router = useRouter()
const { site } = useData()

onMounted(() => {
  const STORAGE_KEY_LANG = 'vitepress-theme-lang'
  const supportedLangs = ['en', 'es']
  const base = site.value.base || '/'
  
  // Intentar obtener el idioma guardado en localStorage
  let selectedLang = localStorage.getItem(STORAGE_KEY_LANG)
  
  // Si no hay idioma guardado, detectar del navegador
  if (!selectedLang || !supportedLangs.includes(selectedLang)) {
    const browserLang = navigator.language.toLowerCase()
    selectedLang = 'en' // default
    
    for (const lang of supportedLangs) {
      if (browserLang.startsWith(lang)) {
        selectedLang = lang
        break
      }
    }
    
    // Guardar la preferencia
    localStorage.setItem(STORAGE_KEY_LANG, selectedLang)
  }
  
  // Construir la ruta completa con el base
  const redirectPath = base === '/' 
    ? `/${selectedLang}/` 
    : `${base}${selectedLang}/`
  
  router.go(redirectPath)
})
</script>

# Redirecting...

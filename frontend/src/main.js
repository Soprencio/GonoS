import { createApp } from 'vue'
import './assets/theme.css'
import './state/auth.js'
import router from './router/index.js'
import App from './App.vue'

const app = createApp(App)
app.use(router)
app.mount('#app')

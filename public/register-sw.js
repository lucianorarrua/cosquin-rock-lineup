/**
 * Script de registro del Service Worker
 * Se ejecuta en el navegador para registrar y gestionar el SW.
 * 
 * Este script es pequeño y se carga inline para mínimo impacto en performance.
 */

(function() {
  'use strict';
  
  // Solo registrar si el navegador soporta Service Workers
  if (!('serviceWorker' in navigator)) {
    console.log('[App] Service Workers not supported by this browser.');
    return;
  }
  
  // Registrar cuando la página termine de cargar (no bloquear renderizado)
  window.addEventListener('load', function() {
    registerServiceWorker();
  });
  
  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('[App] Service Worker registered successfully:', registration.scope);
      
      // Escuchar cuando hay una nueva versión disponible
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Hay una nueva versión lista - notificar al usuario sutilmente
              showUpdateNotification(newWorker);
            }
          });
        }
      });
      
      // Verificar actualizaciones periódicamente (cada hora)
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
      
    } catch (error) {
      console.error('[App] Service Worker registration failed:', error);
    }
  }
  
  /**
   * Muestra una notificación sutil cuando hay una nueva versión disponible.
   * No fuerza la actualización automáticamente para no interrumpir al usuario.
   */
  function showUpdateNotification(worker) {
    // Crear notificación de actualización
    const notification = document.createElement('div');
    notification.id = 'sw-update-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        bottom: 1rem;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #1e293b, #0f172a);
        border: 1px solid #334155;
        color: #e2e8f0;
        padding: 0.75rem 1.25rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 0.875rem;
        animation: slideUp 0.3s ease-out;
      ">
        <span>🔄 Nueva versión disponible</span>
        <button onclick="window.location.reload()" style="
          background: #f59e0b;
          color: #0a0a0f;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.8rem;
          transition: background 0.2s;
        ">Actualizar</button>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: transparent;
          color: #94a3b8;
          border: none;
          padding: 0.25rem;
          cursor: pointer;
          font-size: 1.1rem;
          line-height: 1;
        ">✕</button>
      </div>
      <style>
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(1rem); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      </style>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-ocultar después de 10 segundos si el usuario no interactúa
    setTimeout(() => {
      const el = document.getElementById('sw-update-notification');
      if (el) el.remove();
    }, 10000);
  }
  
  /**
   * Detectar cuando el usuario vuelve online y podría querer refrescar.
   */
  window.addEventListener('online', function() {
    console.log('[App] Connection restored. Cache will update in background.');
  });
  
  window.addEventListener('offline', function() {
    console.log('[App] Connection lost. Serving from cache.');
  });
})();

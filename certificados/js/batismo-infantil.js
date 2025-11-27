// Usa CONFIG do config.js (carregado antes deste script)
const baseUrl = typeof CONFIG !== 'undefined' ? CONFIG.BASE_URL : 'https://n8n.deoliveiratech.com/webhook/ipalpha/novos-membros';

function hideLoading() {
  const loadingScreen = document.getElementById('loading-screen');
  const certificadoWrapper = document.getElementById('certificado-wrapper');

  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }

  if (certificadoWrapper) {
    certificadoWrapper.style.display = 'block';
  }
}

function showError(message) {
  const loadingContent = document.querySelector('.loading-content');
  if (loadingContent) {
    loadingContent.innerHTML = `
      <p style="color: #d32f2f; font-size: 1.2rem; font-weight: 600;">Erro ao carregar</p>
      <p style="color: #666; margin-top: 0.5rem;">${message}</p>
    `;
  }
}

function formatarDataAtual() {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = meses[hoje.getMonth()];
  const ano = hoje.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

async function preencherCertificado() {
  try {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      showError('ID não fornecido na URL');
      return;
    }

    const res = await fetch(`${baseUrl}?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

    const { usuario } = await res.json();

    // Preenche todos os campos com data-field
    document.querySelectorAll('[data-field]').forEach(el => {
      const field = el.getAttribute('data-field');
      let value = usuario[field];

      if (value) {
        el.textContent = typeof value === 'string' ? value.trim() : value;
      }
    });

    // Usa data fixa do CONFIG ou data atual como fallback
    const dataBatismoEl = document.querySelector('[data-field="data_batismo"]');
    if (dataBatismoEl) {
      dataBatismoEl.textContent = typeof CONFIG !== 'undefined' ? CONFIG.DATA_BATISMO : formatarDataAtual();
    }

    hideLoading();
  } catch (err) {
    console.error('Erro ao preencher o certificado:', err);
    showError(err.message || 'Erro desconhecido ao carregar os dados');
  }
}

document.addEventListener('DOMContentLoaded', preencherCertificado);

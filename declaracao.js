// Usa CONFIG do config.js
const baseUrl = typeof CONFIG !== 'undefined' ? CONFIG.BASE_URL : 'https://n8n.deoliveiratech.com/webhook/ipalpha/novos-membros';

function hideLoading() {
  const loadingScreen = document.getElementById('loading-screen');
  const declaracaoWrapper = document.getElementById('declaracao-wrapper');

  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }

  if (declaracaoWrapper) {
    declaracaoWrapper.style.display = 'block';
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

async function buscarDadosMembro(id) {
  // Tenta buscar do cache primeiro
  if (typeof MembrosCache !== 'undefined') {
    const cached = MembrosCache.buscarPorId(id);
    if (cached) {
      console.log(`[declaracao.js] Membro ${id} encontrado no cache`);
      return cached;
    }
  }

  // Se não tem no cache, faz request
  console.log(`[declaracao.js] Buscando membro ${id} da API`);
  const res = await fetch(`${baseUrl}?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
  return res.json();
}

function preencherElemento(container, payload) {
  const { usuario } = payload;

  container.querySelectorAll('[data-field="nome"]').forEach(el => {
    el.textContent = usuario.nome?.trim?.() ?? '';
  });
}

async function preencherDeclaracao() {
  try {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');

    if (!idParam) {
      showError('ID não fornecido na URL');
      return;
    }

    const ids = idParam.split(',').filter(Boolean);
    console.log('[declaracao.js] IDs para buscar:', ids);

    // Busca todos os membros
    const membros = [];
    for (const id of ids) {
      const dados = await buscarDadosMembro(id);
      if (dados) {
        console.log(`[declaracao.js] Membro ${id} carregado:`, dados.usuario?.nome);
        membros.push(dados);
      } else {
        console.warn(`[declaracao.js] Membro ${id} não encontrado`);
      }
    }

    console.log(`[declaracao.js] Total de membros carregados: ${membros.length}/${ids.length}`);

    if (membros.length === 0) {
      showError('Nenhum membro encontrado');
      return;
    }

    // Usa ids.length para decidir modo único vs lote
    if (ids.length === 1) {
      // Modo normal: preenche a declaração única
      preencherElemento(document, membros[0]);
    } else {
      // Modo lote: duplica o template para cada membro
      renderizarMultiplos(membros);
    }

    hideLoading();

  } catch (err) {
    console.error('Erro ao preencher a declaração:', err);
    showError(err.message || 'Erro desconhecido ao carregar os dados');
  }
}

function renderizarMultiplos(membros) {
  const wrapper = document.querySelector('.declaracao-wrapper');
  if (!wrapper) return;

  // Ativa modo lote no body para permitir scroll
  document.body.classList.add('modo-lote');

  // Clona o template original
  const templateOriginal = wrapper.outerHTML;
  const container = wrapper.parentElement;
  wrapper.remove();

  membros.forEach((dados, index) => {
    const div = document.createElement('div');
    div.innerHTML = templateOriginal;
    const novoWrapper = div.firstElementChild;
    novoWrapper.classList.add('documento');
    novoWrapper.id = `doc-${index}`;
    novoWrapper.style.display = 'block'; // Remove o display:none herdado do template

    preencherElemento(novoWrapper, dados);
    container.appendChild(novoWrapper);
  });

  // Adiciona CSS para impressão em lote
  const style = document.createElement('style');
  style.textContent = `
    .declaracao-wrapper.documento {
      page-break-after: always;
      break-after: page;
    }
    .declaracao-wrapper.documento:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
  `;
  document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', preencherDeclaracao);

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

async function buscarDadosMembro(id) {
  // Tenta buscar do cache primeiro
  if (typeof MembrosCache !== 'undefined') {
    const cached = MembrosCache.buscarPorId(id);
    if (cached) {
      console.log(`[batismo-adulto.js] Membro ${id} encontrado no cache`);
      return cached;
    }
  }

  // Se não tem no cache, faz request
  console.log(`[batismo-adulto.js] Buscando membro ${id} da API`);
  const res = await fetch(`${baseUrl}?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
  return res.json();
}

function preencherElemento(container, payload) {
  const { usuario } = payload;

  // Preenche todos os campos com data-field
  container.querySelectorAll('[data-field]').forEach(el => {
    const field = el.getAttribute('data-field');
    let value = usuario[field];

    if (value) {
      el.textContent = typeof value === 'string' ? value.trim() : value;
    }
  });

  // Usa data fixa do CONFIG ou data atual como fallback
  const dataBatismoEl = container.querySelector('[data-field="data_batismo"]');
  if (dataBatismoEl) {
    dataBatismoEl.textContent = typeof CONFIG !== 'undefined' ? CONFIG.DATA_BATISMO : formatarDataAtual();
  }
}

async function preencherCertificado() {
  try {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');

    if (!idParam) {
      showError('ID não fornecido na URL');
      return;
    }

    const ids = idParam.split(',').filter(Boolean);
    console.log('[batismo-adulto.js] IDs para buscar:', ids);

    // Busca todos os membros
    const membros = [];
    for (const id of ids) {
      const dados = await buscarDadosMembro(id);
      if (dados) {
        console.log(`[batismo-adulto.js] Membro ${id} carregado:`, dados.usuario?.nome);
        membros.push(dados);
      } else {
        console.warn(`[batismo-adulto.js] Membro ${id} não encontrado`);
      }
    }

    console.log(`[batismo-adulto.js] Total de membros carregados: ${membros.length}/${ids.length}`);

    if (membros.length === 0) {
      showError('Nenhum membro encontrado');
      return;
    }

    // Usa ids.length para decidir modo único vs lote
    // (mesmo que alguns não tenham sido encontrados)
    if (ids.length === 1) {
      // Modo normal: preenche o certificado único
      preencherElemento(document, membros[0]);
    } else {
      // Modo lote: duplica o template para cada membro
      renderizarMultiplos(membros);
    }

    hideLoading();

  } catch (err) {
    console.error('Erro ao preencher o certificado:', err);
    showError(err.message || 'Erro desconhecido ao carregar os dados');
  }
}

function renderizarMultiplos(membros) {
  console.log('[batismo-adulto.js] renderizarMultiplos chamado com', membros.length, 'membros');

  const wrapper = document.getElementById('certificado-wrapper');
  if (!wrapper) {
    console.error('[batismo-adulto.js] certificado-wrapper não encontrado!');
    return;
  }

  // Ativa modo lote no body para permitir scroll
  document.body.classList.add('modo-lote');

  // Clona o template original
  const templateOriginal = wrapper.outerHTML;
  const container = wrapper.parentElement;
  console.log('[batismo-adulto.js] Container:', container.tagName);

  wrapper.remove();

  membros.forEach((dados, index) => {
    console.log(`[batismo-adulto.js] Criando certificado ${index + 1}/${membros.length} para:`, dados.usuario?.nome);

    const div = document.createElement('div');
    div.innerHTML = templateOriginal;
    const novoWrapper = div.firstElementChild;
    novoWrapper.classList.add('documento');
    novoWrapper.id = `doc-${index}`;
    novoWrapper.style.display = 'block';

    preencherElemento(novoWrapper, dados);
    container.appendChild(novoWrapper);
  });

  console.log('[batismo-adulto.js] Total de elementos no container:', container.children.length);

  // Adiciona CSS para impressão em lote
  const style = document.createElement('style');
  style.textContent = `
    .certificado-wrapper.documento {
      page-break-after: always;
      break-after: page;
    }
    .certificado-wrapper.documento:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
  `;
  document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', preencherCertificado);

// Usa CONFIG do config.js
const baseUrl = typeof CONFIG !== 'undefined' ? CONFIG.BASE_URL : 'https://n8n.deoliveiratech.com/webhook/ipalpha/novos-membros';

function hideLoading() {
  const loadingScreen = document.getElementById('loading-screen');
  const formWrapper = document.getElementById('form-wrapper');

  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }

  if (formWrapper) {
    formWrapper.style.display = 'block';
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

function marcarStatusCheckbox(textoStatus, container = document) {
  if (!textoStatus) return;

  const texto = textoStatus.toLowerCase();
  let checkboxId = null;

  if (texto.includes('batismo') && texto.includes('profissão de fé')) {
    checkboxId = 'status-batismo-profissao';
  } else if (texto.includes('profissão de fé') || texto.includes('profissao de fe')) {
    checkboxId = 'status-profissao';
  } else if (texto.includes('batismo infantil') || texto.includes('batizados na infância') || texto.includes('batizados na infancia')) {
    checkboxId = 'status-batismo-infantil';
  } else if (texto.includes('transferência') || texto.includes('transferencia') || texto.includes('carta de transferência')) {
    checkboxId = 'status-transferencia';
  } else if (texto.includes('membro menor') || texto.includes('menor de idade')) {
    checkboxId = 'status-menor';
  } else if (texto.includes('jurisdição') || texto.includes('jurisdicao') || texto.includes('membro')) {
    checkboxId = 'status-membro';
  }

  if (checkboxId) {
    const checkbox = container.querySelector(`#${checkboxId}`);
    if (checkbox) checkbox.checked = true;
  }
}

function transformarLinkDrive(openURL) {
  if (!openURL) return '';

  let id = openURL.match(/[?&]id=([^&]+)/)?.[1];
  if (!id) {
    id = openURL.match(/\/file\/d\/([^/]+)/)?.[1];
  }

  return id ? `https://drive.usercontent.google.com/download?id=${id}&export=view&authuser=0` : '';
}

function preencherElemento(container, payload) {
  const { usuario, endereco, igreja } = payload;

  function preencherGrupo(obj) {
    Object.entries(obj).forEach(([key, value]) => {
      if (key === 'relacao_igreja') {
        marcarStatusCheckbox(value, container);
        return;
      }
      const el = container.querySelector(`[data-field="${key}"]`);
      if (el) el.textContent = value?.trim?.() ?? value;
    });
  }

  preencherGrupo(usuario);
  preencherGrupo(endereco);
  preencherGrupo(igreja);

  // Foto
  const fotoUrl = transformarLinkDrive(usuario.imagem);
  const img = container.querySelector('#foto3x4') || container.querySelector('.foto3x4');
  const label = container.querySelector('#foto-label') || container.querySelector('.foto-label');

  if (fotoUrl && img) {
    let tentativasImagem = 0;
    const MAX_TENTATIVAS = 3;
    const DELAY_ENTRE_TENTATIVAS = 500;
    const fileId = fotoUrl.match(/id=([^&]+)/)?.[1];

    const urlsParaTentar = fileId ? [
      `https://lh3.googleusercontent.com/d/${fileId}=w400`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
      `https://drive.usercontent.google.com/download?id=${fileId}&export=view&authuser=0`
    ] : [];

    img.onload = function() {
      img.style.display = 'block';
      if (label) label.style.display = 'none';
    };

    img.onerror = function() {
      tentativasImagem++;
      if (tentativasImagem >= MAX_TENTATIVAS) {
        img.style.display = 'none';
        if (label) label.style.display = 'block';
        return;
      }
      setTimeout(() => {
        const novaUrl = urlsParaTentar[tentativasImagem];
        if (novaUrl) img.src = novaUrl;
      }, DELAY_ENTRE_TENTATIVAS);
    };

    if (urlsParaTentar.length > 0) {
      img.src = urlsParaTentar[0];
    }
  }
}

async function buscarDadosMembro(id) {
  // Tenta buscar do cache primeiro
  if (typeof MembrosCache !== 'undefined') {
    const cached = MembrosCache.buscarPorId(id);
    if (cached) {
      console.log(`[index.js] Membro ${id} encontrado no cache`);
      return cached;
    }
  }

  // Se não tem no cache, faz request
  console.log(`[index.js] Buscando membro ${id} da API`);
  const res = await fetch(`${baseUrl}?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

async function preencherFicha() {
  try {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');

    if (!idParam) {
      showError('ID não fornecido na URL');
      return;
    }

    const ids = idParam.split(',').filter(Boolean);
    console.log('[index.js] IDs para buscar:', ids);

    // Busca todos os membros
    const membros = [];
    for (const id of ids) {
      const dados = await buscarDadosMembro(id);
      if (dados) {
        console.log(`[index.js] Membro ${id} carregado:`, dados.usuario?.nome);
        membros.push(dados);
      } else {
        console.warn(`[index.js] Membro ${id} não encontrado`);
      }
    }

    console.log(`[index.js] Total de membros carregados: ${membros.length}/${ids.length}`);

    if (membros.length === 0) {
      showError('Nenhum membro encontrado');
      return;
    }

    // Usa ids.length para decidir modo único vs lote
    if (ids.length === 1) {
      // Modo normal: preenche a ficha única
      preencherElemento(document, membros[0]);
    } else {
      // Modo lote: duplica o template para cada membro
      renderizarMultiplos(membros);
    }

    hideLoading();

  } catch (err) {
    console.error('Erro ao preencher a ficha:', err);
    showError(err.message || 'Erro desconhecido ao carregar os dados');
  }
}

function renderizarMultiplos(membros) {
  const formWrapper = document.getElementById('form-wrapper');
  if (!formWrapper) return;

  // Ativa modo lote no body para permitir scroll
  document.body.classList.add('modo-lote');

  // Clona o template original
  const templateOriginal = formWrapper.innerHTML;
  formWrapper.innerHTML = '';

  membros.forEach((dados, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'documento ficha';
    wrapper.id = `doc-${index}`;
    wrapper.innerHTML = templateOriginal;

    preencherElemento(wrapper, dados);
    formWrapper.appendChild(wrapper);
  });

  // Adiciona CSS para impressão em lote
  const style = document.createElement('style');
  style.textContent = `
    .documento.ficha {
      page-break-after: always;
      break-after: page;
    }
    .documento.ficha:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    @media print {
      .documento.ficha {
        width: 100vw !important;
        height: 100vh !important;
      }
    }
  `;
  document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', preencherFicha);

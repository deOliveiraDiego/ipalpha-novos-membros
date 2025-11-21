const baseUrl = 'https://n8n-n8n.8c7vto.easypanel.host/webhook/ipalpha/novos-membros';

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

async function preencherFicha() {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      showError('ID não fornecido na URL');
      return;
    }
    console.log('ID:', id);

    const url = `${baseUrl}?id=${encodeURIComponent(id)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const payload = await res.json();
    console.log('Payload:', payload);
    const { usuario, endereco, igreja } = payload;

    function preencherGrupo(obj) {
      Object.entries(obj).forEach(([key, value]) => {
        const el = document.querySelector(`[data-field="${key}"]`);
        if (el) el.textContent = value?.trim?.() ?? value;
      });
    }

    function transformarLinkDrive(openURL) {
      if (!openURL) return '';

      // Tenta extrair o ID de diferentes formatos de URL do Google Drive
      let id = null;

      // Formato: https://drive.google.com/open?id=XXX
      id = openURL.match(/[?&]id=([^&]+)/)?.[1];

      // Formato: https://drive.google.com/file/d/XXX/view
      if (!id) {
        id = openURL.match(/\/file\/d\/([^/]+)/)?.[1];
      }

      return id
        ? `https://drive.usercontent.google.com/download?id=${id}&export=view&authuser=0`
        : '';
    }


    preencherGrupo(usuario);
    preencherGrupo(endereco);
    preencherGrupo(igreja);

    const fotoUrl = transformarLinkDrive(usuario.imagem);
    const img = document.getElementById('foto3x4');
    const label = document.getElementById('foto-label');

    if (fotoUrl && img) {
      console.log('Tentando carregar imagem:', fotoUrl);

      img.onload = function() {
        console.log('Imagem carregada com sucesso!');
        img.style.display = 'block';
        if (label) label.style.display = 'none';
      };

      img.onerror = function() {
        console.error('Erro ao carregar imagem. Tentando formato alternativo...');
        // Tenta formato de thumbnail como fallback
        const id = fotoUrl.match(/id=([^&]+)/)?.[1];
        if (id) {
          const thumbnailUrl = `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
          console.log('Tentando thumbnail:', thumbnailUrl);
          img.src = thumbnailUrl;
        }
      };

      img.src = fotoUrl;
    }

    // Esconde o loading e mostra o formulário
    hideLoading();

  } catch (err) {
    console.error('Erro ao preencher a ficha:', err);
    showError(err.message || 'Erro desconhecido ao carregar os dados');
  }
}
document.addEventListener('DOMContentLoaded', preencherFicha);
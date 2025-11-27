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
        // Status tem tratamento especial com checkboxes
        if (key === 'relacao_igreja') {
          marcarStatusCheckbox(value);
          return;
        }

        const el = document.querySelector(`[data-field="${key}"]`);
        if (el) el.textContent = value?.trim?.() ?? value;
      });
    }

    function marcarStatusCheckbox(textoStatus) {
      if (!textoStatus) return;

      const texto = textoStatus.toLowerCase();

      // Mapeia o texto para o checkbox correto
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
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
          checkbox.checked = true;
        }
      }
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

      let tentativasImagem = 0;
      const MAX_TENTATIVAS = 3;
      const fileId = fotoUrl.match(/id=([^&]+)/)?.[1];

      // Função para diagnosticar o erro real
      async function diagnosticarImagem(url) {
        console.log('=== DIAGNÓSTICO DE IMAGEM ===');
        console.log('URL testada:', url);
        try {
          const response = await fetch(url, { mode: 'no-cors' });
          console.log('Fetch no-cors - tipo:', response.type);
        } catch (error) {
          console.error('Fetch falhou:', error.name, '-', error.message);
        }
      }

      img.onload = function() {
        console.log('Imagem carregada com sucesso!');
        img.style.display = 'block';
        if (label) label.style.display = 'none';
      };

      img.onerror = function() {
        tentativasImagem++;
        console.error(`Tentativa ${tentativasImagem} falhou`);

        // Diagnóstico na última tentativa
        if (tentativasImagem >= MAX_TENTATIVAS) {
          console.error('Todas as tentativas de carregar imagem falharam');
          diagnosticarImagem(img.src);
          img.style.display = 'none';
          if (label) label.style.display = 'block';
          return;
        }

        if (fileId) {
          let novaUrl;

          if (tentativasImagem === 1) {
            novaUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
          } else if (tentativasImagem === 2) {
            novaUrl = `https://lh3.googleusercontent.com/d/${fileId}=w400`;
          }

          console.log(`Tentativa ${tentativasImagem + 1}:`, novaUrl);
          img.src = novaUrl;
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
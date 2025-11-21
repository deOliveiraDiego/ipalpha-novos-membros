const baseUrl = 'https://n8n-n8n.8c7vto.easypanel.host/webhook/ipalpha/novos-membros';
async function preencherFicha() {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) throw new Error('ID não fornecido na URL');
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

  } catch (err) {
    console.error('Erro ao preencher a ficha:', err);
  }
}
document.addEventListener('DOMContentLoaded', preencherFicha);
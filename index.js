const baseUrl = 'https://n8n.deoliveiratech.com/webhook/ipalpha/novos-membros';
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
      const id = openURL.match(/id=([^&]+)/)?.[1];
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

    // if (fotoUrl && img) {
    //   img.src = 'https://drive.google.com/file/d/1gIbtfTpmnwO7IK7oxSd3YCF0JR-yzhSH/view?usp=sharing';
    //   img.style.display = 'block';
    //   if (label) label.style.display = 'none';
    // }

  } catch (err) {
    console.error('Erro ao preencher a ficha:', err);
  }
}
document.addEventListener('DOMContentLoaded', preencherFicha);
const baseUrl = 'https://n8n.deoliveiratech.com/webhook/ipalpha/novos-membros';

async function preencherDeclaracao() {
  try {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) throw new Error('ID não fornecido na URL');

    const res = await fetch(`${baseUrl}?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

    const { usuario } = await res.json();

    document.querySelectorAll('[data-field="nome"]').forEach(el => {
      el.textContent = usuario.nome?.trim?.() ?? '';
    });
  } catch (err) {
    console.error('Erro ao preencher a declaração:', err);
  }
}

document.addEventListener('DOMContentLoaded', preencherDeclaracao);
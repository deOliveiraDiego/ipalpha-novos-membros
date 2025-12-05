// Usa CONFIG do config.js
const baseUrl = typeof CONFIG !== 'undefined' ? CONFIG.BASE_URL : 'https://n8n.deoliveiratech.com/webhook/ipalpha/novos-membros';

let membrosData = [];

function hideLoading() {
  const loadingScreen = document.getElementById('loading-screen');
  const container = document.getElementById('container');

  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }

  if (container) {
    container.style.display = 'block';
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

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return '-';

  // Converte para string caso venha como objeto Date
  const dataStr = String(dataNascimento);

  // Tenta parsear diferentes formatos de data
  let nasc;
  if (dataStr.includes('/')) {
    const partes = dataStr.split('/');
    nasc = new Date(partes[2], partes[1] - 1, partes[0]);
  } else {
    nasc = new Date(dataNascimento);
  }

  if (isNaN(nasc.getTime())) return '-';

  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

// Reutiliza a mesma lógica de normalização do index.js
function classificarStatus(textoStatus) {
  if (!textoStatus) return { classe: '', texto: '-' };

  const texto = textoStatus.toLowerCase();

  if (texto.includes('batismo') && texto.includes('profissão de fé')) {
    return { classe: 'profissao', texto: 'Batismo e Profissão de Fé' };
  } else if (texto.includes('profissão de fé') || texto.includes('profissao de fe')) {
    return { classe: 'profissao', texto: 'Profissão de Fé' };
  } else if (texto.includes('batismo infantil') || texto.includes('batizados na infância') || texto.includes('batizados na infancia')) {
    return { classe: 'batismo-infantil', texto: 'Batismo Infantil' };
  } else if (texto.includes('transferência') || texto.includes('transferencia') || texto.includes('carta de transferência')) {
    return { classe: 'transferencia', texto: 'Transferência' };
  } else if (texto.includes('membro menor') || texto.includes('menor de idade')) {
    return { classe: 'menor', texto: 'Membro Menor' };
  } else if (texto.includes('jurisdição') || texto.includes('jurisdicao')) {
    return { classe: 'transferencia', texto: 'Jurisdição' };
  }

  return { classe: '', texto: textoStatus };
}

function classificarIdade(idade) {
  if (idade === '-' || isNaN(idade)) return '';
  if (idade <= 11) return 'crianca';
  if (idade <= 17) return 'adolescente';
  return 'adulto';
}

function renderizarTabela(membros) {
  const tbody = document.getElementById('tbody-membros');
  tbody.innerHTML = '';

  membros.forEach((membro, index) => {
    // Novo formato: { usuario: {...}, endereco: {...}, igreja: {...} }
    const usuario = membro.usuario || {};
    const igreja = membro.igreja || {};

    const id = usuario.row_number || usuario.id || index;
    const nome = usuario.nome || '';
    const nascimento = usuario.nascimento || '';
    const relacaoIgreja = igreja.relacao_igreja || '';
    const sexo = usuario.sexo || '';

    const idade = calcularIdade(nascimento);
    const status = classificarStatus(relacaoIgreja);
    const faixaEtaria = classificarIdade(idade);

    const tr = document.createElement('tr');
    tr.dataset.id = id;
    tr.dataset.index = index; // Guarda o índice para recuperar dados completos
    tr.dataset.status = status.classe;
    tr.dataset.faixaEtaria = faixaEtaria;
    tr.dataset.sexo = (sexo || '').toLowerCase();
    tr.dataset.nome = (nome || '').toLowerCase();

    tr.innerHTML = `
      <td class="col-checkbox">
        <input type="checkbox" name="membro" value="${index}">
      </td>
      <td class="col-roll">${id || '-'}</td>
      <td class="col-nome">${nome || '-'}</td>
      <td class="col-nascimento">${nascimento || '-'}</td>
      <td class="col-idade">${idade}</td>
      <td class="col-status">
        <span class="status-badge ${status.classe}">${status.texto}</span>
      </td>
      <td class="col-sexo">${(sexo || '-').charAt(0).toUpperCase()}</td>
    `;

    tbody.appendChild(tr);
  });
}

function aplicarFiltros() {
  const filtroNome = document.getElementById('filtro-nome').value.toLowerCase();
  const filtroStatus = document.getElementById('filtro-status').value;
  const filtroIdade = document.getElementById('filtro-idade').value;

  const linhas = document.querySelectorAll('#tbody-membros tr');

  linhas.forEach(tr => {
    const nome = tr.dataset.nome || '';
    const status = tr.dataset.status || '';
    const faixaEtaria = tr.dataset.faixaEtaria || '';

    let visivel = true;

    if (filtroNome && !nome.includes(filtroNome)) {
      visivel = false;
    }

    if (filtroStatus && status !== filtroStatus) {
      visivel = false;
    }

    if (filtroIdade && faixaEtaria !== filtroIdade) {
      visivel = false;
    }

    tr.classList.toggle('hidden', !visivel);
  });

  atualizarContador();
}

function atualizarContador() {
  const selecionados = document.querySelectorAll('#tbody-membros tr:not(.hidden) input[name="membro"]:checked');
  const contador = document.getElementById('contador-selecionados');
  const btnGerar = document.getElementById('btn-gerar');

  contador.textContent = `${selecionados.length} selecionado(s)`;
  btnGerar.disabled = selecionados.length === 0;
}

function selecionarTodos(marcar) {
  const checkboxes = document.querySelectorAll('#tbody-membros tr:not(.hidden) input[name="membro"]');
  checkboxes.forEach(cb => {
    cb.checked = marcar;
    cb.closest('tr').classList.toggle('selecionado', marcar);
  });
  atualizarContador();
}

function gerarDocumentos() {
  const selecionados = document.querySelectorAll('#tbody-membros input[name="membro"]:checked');
  const tipoDoc = document.getElementById('tipo-documento').value;

  if (selecionados.length === 0) {
    alert('Selecione pelo menos um membro.');
    return;
  }

  // CASO ESPECIAL: Certificado Infantil precisa separar por sexo
  if (tipoDoc === 'certificado-infantil') {
    const masculinos = [];
    const femininos = [];

    Array.from(selecionados).forEach(cb => {
      const tr = cb.closest('tr');
      const id = tr.dataset.id;
      const sexo = tr.dataset.sexo;

      if (sexo === 'masculino') {
        masculinos.push(id);
      } else if (sexo === 'feminino') {
        femininos.push(id);
      }
    });

    // Abrir janela para masculinos (se houver)
    if (masculinos.length > 0) {
      const urlMasc = `certificados/infantil-masculino.html?id=${masculinos.join(',')}`;
      window.open(urlMasc, '_blank');
    }

    // Abrir janela para femininos (se houver)
    if (femininos.length > 0) {
      const urlFem = `certificados/infantil-feminino.html?id=${femininos.join(',')}`;
      window.open(urlFem, '_blank');
    }

    return;
  }

  // LÓGICA NORMAL para outros documentos
  const ids = Array.from(selecionados)
    .map(cb => cb.closest('tr').dataset.id)
    .join(',');

  const paginas = {
    'ficha': 'index.html',
    'declaracao': 'declaracao.html',
    'certificado-adulto': 'certificados/adulto.html'
  };

  const url = `${paginas[tipoDoc]}?id=${ids}`;
  window.open(url, '_blank');
}

async function carregarMembros() {
  try {
    console.log('Buscando membros de:', baseUrl);
    const res = await fetch(baseUrl);
    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

    const data = await res.json();
    console.log('Resposta do endpoint:', data);

    // O endpoint pode retornar diferentes formatos
    if (Array.isArray(data)) {
      membrosData = data;
    } else if (data.membros) {
      membrosData = data.membros;
    } else if (data.usuarios) {
      membrosData = data.usuarios;
    } else if (data.data) {
      membrosData = Array.isArray(data.data) ? data.data : [data.data];
    } else {
      // Tenta encontrar qualquer array no objeto
      const possiveisArrays = Object.values(data).filter(v => Array.isArray(v));
      if (possiveisArrays.length > 0) {
        membrosData = possiveisArrays[0];
      } else {
        // Se for um objeto único, coloca em array
        membrosData = [data];
      }
    }

    console.log('Membros carregados:', membrosData.length);
    console.log('Exemplo de membro:', membrosData[0]);
    console.log('Campos disponíveis:', Object.keys(membrosData[0] || {}));

    if (membrosData.length === 0) {
      showError('Nenhum membro encontrado. Verifique se o endpoint está retornando dados.');
      return;
    }

    // Salva no cache para outras páginas usarem
    if (typeof MembrosCache !== 'undefined') {
      MembrosCache.salvar(membrosData);
    }

    renderizarTabela(membrosData);
    hideLoading();

  } catch (err) {
    console.error('Erro ao carregar membros:', err);
    showError(err.message || 'Erro desconhecido ao carregar os dados');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  carregarMembros();

  // Filtros
  document.getElementById('filtro-nome').addEventListener('input', aplicarFiltros);
  document.getElementById('filtro-status').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-idade').addEventListener('change', aplicarFiltros);

  // Selecionar todos
  document.getElementById('selecionar-todos').addEventListener('change', (e) => {
    selecionarTodos(e.target.checked);
  });

  // Checkbox individual
  document.getElementById('tbody-membros').addEventListener('change', (e) => {
    if (e.target.name === 'membro') {
      e.target.closest('tr').classList.toggle('selecionado', e.target.checked);
      atualizarContador();

      // Atualiza "selecionar todos"
      const checkboxes = document.querySelectorAll('#tbody-membros tr:not(.hidden) input[name="membro"]');
      const todosMarcados = Array.from(checkboxes).every(cb => cb.checked);
      document.getElementById('selecionar-todos').checked = todosMarcados;
    }
  });

  // Botão gerar
  document.getElementById('btn-gerar').addEventListener('click', gerarDocumentos);
});

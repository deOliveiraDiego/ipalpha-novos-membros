// Módulo de cache para dados de membros
// Evita múltiplas requisições à API do Google Sheets

const CACHE_KEY = 'membrosCache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

const MembrosCache = {
  // Salva todos os membros no cache
  salvar(membros) {
    const dados = {
      membros,
      timestamp: Date.now()
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(dados));
    console.log(`[Cache] Salvos ${membros.length} membros no cache`);
  },

  // Busca um membro pelo row_number
  buscarPorId(id) {
    const cache = this._lerCache();
    if (!cache) return null;

    const membro = cache.membros.find(m =>
      String(m.usuario?.row_number) === String(id)
    );

    if (membro) {
      console.log(`[Cache] Membro ${id} encontrado no cache`);
    }

    return membro;
  },

  // Busca múltiplos membros
  buscarPorIds(ids) {
    const resultado = ids.map(id => this.buscarPorId(id)).filter(Boolean);
    console.log(`[Cache] Encontrados ${resultado.length}/${ids.length} membros no cache`);
    return resultado;
  },

  // Verifica se cache é válido e retorna os dados
  _lerCache() {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) {
      console.log('[Cache] Cache vazio');
      return null;
    }

    try {
      const dados = JSON.parse(raw);
      const idade = Date.now() - dados.timestamp;

      // Cache expirado
      if (idade > CACHE_TTL) {
        console.log('[Cache] Cache expirado, removendo...');
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }

      const minutosRestantes = Math.round((CACHE_TTL - idade) / 60000);
      console.log(`[Cache] Cache válido (expira em ${minutosRestantes} min)`);
      return dados;
    } catch (e) {
      console.error('[Cache] Erro ao ler cache:', e);
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
  },

  // Verifica se tem cache válido
  temCache() {
    return this._lerCache() !== null;
  },

  // Limpa o cache manualmente
  limpar() {
    sessionStorage.removeItem(CACHE_KEY);
    console.log('[Cache] Cache limpo');
  }
};

// Exporta para uso global
if (typeof window !== 'undefined') {
  window.MembrosCache = MembrosCache;
}

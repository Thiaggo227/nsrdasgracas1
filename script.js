// CONFIGURAÇÃO SUPABASE
// ================================
const SUPABASE_URL = "https://snyenbmszpaulmidxevm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ZStL2FdbZXEHnX5LCTUN1g_Fj5DUXVx";

let supabaseClient = null;

try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("🟢 Conectado ao Supabase!");
  }
} catch (error) {
  console.error("🔴 Erro crítico ao conectar ao Supabase:", error);
}

// ==========================================
// INICIALIZAÇÃO ÚNICA (DOMContentLoaded)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Menu Hambúrguer
  const menuButton = document.querySelector(".menuHamburguer");
  const menu = document.getElementById("menu");

  if (menuButton && menu) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.45)";
    overlay.style.zIndex = "999";
    overlay.style.opacity = "0";
    overlay.style.visibility = "hidden";
    overlay.style.transition = "0.3s";
    document.body.appendChild(overlay);

    function abrirMenu() {
      menu.classList.add("active");
      menuButton.classList.add("active");
      overlay.style.opacity = "1";
      overlay.style.visibility = "visible";
      menuButton.innerHTML = "FECHAR";
      document.body.style.overflow = "hidden";
    }

    function fecharMenu() {
      menu.classList.remove("active");
      menuButton.classList.remove("active");
      overlay.style.opacity = "0";
      overlay.style.visibility = "hidden";
      menuButton.innerHTML = '<i class="fa-solid fa-bars"></i>';
      document.body.style.overflow = "";
    }

    menuButton.addEventListener("click", () => {
      if (menu.classList.contains("active")) {
        fecharMenu();
      } else {
        abrirMenu();
      }
    });

    overlay.addEventListener("click", fecharMenu);

    document.querySelectorAll(".menu a").forEach(link => {
      link.addEventListener("click", fecharMenu);
    });
  }

  // 2. Lógica do Modal do Dízimo
  const btnDizimo = document.querySelector(".btnDizimo");
  const modal = document.getElementById("modalDizimo");
  const btnFecharX = document.getElementById("fecharModal");
  const btnEntendi = document.getElementById("btnEntendi");
  const btnCopiar = document.getElementById("btnCopiar");
  const cnpjTextoElement = document.getElementById("cnpjTexto");
  const alertaCopiado = document.getElementById("alertaCopiado");

  if (btnDizimo && modal) {
    btnDizimo.addEventListener("click", () => {
      modal.classList.add("active");
    });

    const fecharModal = () => {
      modal.classList.remove("active");
      if (alertaCopiado) alertaCopiado.classList.remove("show");
    };

    if (btnFecharX) btnFecharX.addEventListener("click", fecharModal);
    if (btnEntendi) btnEntendi.addEventListener("click", fecharModal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) fecharModal();
    });

    if (btnCopiar && cnpjTextoElement) {
      btnCopiar.addEventListener("click", () => {
        const textoParaCopiar = cnpjTextoElement.innerText.trim();

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textoParaCopiar)
            .then(() => mostrarAlertaCopiado())
            .catch(err => usarMetodoAntigo(textoParaCopiar));
        } else {
          usarMetodoAntigo(textoParaCopiar);
        }
      });
    }

    function mostrarAlertaCopiado() {
      if (alertaCopiado) {
        alertaCopiado.classList.add("show");
        setTimeout(() => {
          alertaCopiado.classList.remove("show");
        }, 2500);
      }
    }

    function usarMetodoAntigo(texto) {
      try {
        const areaTexto = document.createElement("textarea");
        areaTexto.value = texto;
        areaTexto.style.position = "fixed";
        document.body.appendChild(areaTexto);
        areaTexto.select();
        document.execCommand("copy");
        document.body.removeChild(areaTexto);
        mostrarAlertaCopiado();
      } catch (err) {
        console.error("Erro crítico ao copiar texto: ", err);
      }
    }
  }

  // 3. Chamadas das funções assíncronas e utilitários
  carregarPostagens();
  carregarLeituraDoDia();
  
  // Executa e define o loop da Próxima Missa
  atualizarProximaMissa();
  setInterval(atualizarProximaMissa, 60000);
});

// ==========================================
// FUNÇÕES AUXILIARES E REQUISIÇÕES SUPABASE
// ==========================================

function calcularTempoAtras(dataIso) {
  const agora = new Date();
  const dataPost = new Date(dataIso);
  const diferencaEmSegundos = Math.floor((agora - dataPost) / 1000);

  if (diferencaEmSegundos < 60) return "Agora mesmo";

  const diferencaEmMinutos = Math.floor(diferencaEmSegundos / 60);
  if (diferencaEmMinutos < 60) return `Há ${diferencaEmMinutos} ${diferencaEmMinutos === 1 ? 'minuto' : 'minutos'}`;

  const diferencaEmHoras = Math.floor(diferencaEmMinutos / 60);
  if (diferencaEmHoras < 24) return `Há ${diferencaEmHoras} ${diferencaEmHoras === 1 ? 'hora' : 'horas'}`;

  const diferencaEmDias = Math.floor(diferencaEmHoras / 24);
  if (diferencaEmDias < 7) return `Há ${diferencaEmDias} ${diferencaEmDias === 1 ? 'dia' : 'dias'}`;

  return dataPost.toLocaleDateString('pt-BR');
}

async function carregarPostagens() {
  const mural = document.getElementById("muralPostagens");
  if (!mural) return;

  console.log("🔍 Buscando dados na tabela 'postagens'...");

  try {
    const { data, error } = await supabaseClient
      .from("postagens")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    mural.innerHTML = "";

    if (!data || !data.length) {
      mural.innerHTML = `
        <p style="text-align: center; color: #888888; width: 100%; grid-column: 1 / -1; padding: 20px 0;">
          Ainda não existem avisos ou novidades cadastradas.
        </p>
      `;
      return;
    }

    data.forEach(post => {
      const tempoPassado = calcularTempoAtras(post.created_at);
      
      const artigo = document.createElement("article");
      artigo.className = "post-card";

      if (post.imagem_url) {
        const divImagem = document.createElement("div");
        divImagem.className = "post-imagem";

        const urlMidia = post.imagem_url.trim();

        // 🟢 IDENTIFICA SE É UM VÍDEO (.mp4) OU IMAGEM
        if (urlMidia.toLowerCase().endsWith(".mp4")) {
          const video = document.createElement("video");
          video.src = urlMidia;
          video.controls = true; // Mostra os botões de Play, Pause e Volume
          video.preload = "metadata"; // Carrega apenas as informações básicas no início para economizar internet
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.objectFit = "cover"; // Faz o vídeo preencher o card de forma elegante como a imagem fazia
          divImagem.appendChild(video);
        } else {
          // Se não for vídeo, renderiza a imagem tradicional
          const img = document.createElement("img");
          img.src = urlMidia;
          img.alt = "Aviso da Paróquia";
          divImagem.appendChild(img);
        }

        artigo.appendChild(divImagem);
      }

      const divConteudo = document.createElement("div");
      divConteudo.className = "post-conteudo";

      const spanTempo = document.createElement("span");
      spanTempo.className = "post-tempo";
      spanTempo.innerHTML = `<i class="fa-regular fa-clock"></i> ${tempoPassado}`;

      const pLegenda = document.createElement("p");
      pLegenda.className = "post-legenda";
      pLegenda.textContent = post.legenda || "";

      divConteudo.appendChild(spanTempo);
      divConteudo.appendChild(pLegenda);
      artigo.appendChild(divConteudo);
      
      mural.appendChild(artigo);
    });

  } catch (error) {
    console.error("🔴 Erro ao buscar dados do Supabase:", error);
    mural.innerHTML = `
      <p style="text-align: center; color: #d32f2f; width: 100%; grid-column: 1 / -1; padding: 20px 0;">
        Não foi possível buscar as informações no momento.
      </p>
    `;
  }
}

async function carregarLeituraDoDia() {
  const containerLeitura = document.getElementById("leituraDoDia");
  if (!containerLeitura) return;

  try {
    const { data, error } = await supabaseClient
      .from("leituras")
      .select("*")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    if (data) {
      containerLeitura.innerHTML = `
        <h2><i class="fa-solid fa-book-open"></i> Leitura do dia - ${data.data_texto}</h2>
        <p><strong>${data.referencia}</strong> <br> ${data.resumo}</p>
      `;
    }
  } catch (error) {
    console.error("🔴 Erro ao carregar a leitura do dia:", error);
    containerLeitura.innerHTML = `<p style="color: #888;">Não foi possível carregar a leitura de hoje.</p>`;
  }
}

// LÓGICA DINÂMICA DA PRÓXIMA MISSA
// ==========================================
function atualizarProximaMissa() {
  const textoElemento = document.getElementById("texto-proxima-missa");
  const contadorElemento = document.getElementById("contador-missa");
  
  if (!textoElemento) return;

  const agora = new Date();
  
  const horariosConfig = {
    0: [{ hora: 8, minuto: 0 }],
    1: [{ hora: 19, minuto: 30 }],
    2: [{ hora: 19, minuto: 30 }],
    3: [{ hora: 19, minuto: 30 }],
    4: [{ hora: 16, minuto: 0 }],
    5: [{ hora: 19, minuto: 30 }],
    6: [{ hora: 18, minuto: 30 }]
  };

  const diasSemanaPorExtenso = [
    "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", 
    "Quinta-feira", "Sexta-feira", "Sábado"
  ];

  let listaProximasMissas = [];

  for (let i = 0; i < 7; i++) {
    const dataVerificada = new Date(agora);
    dataVerificada.setDate(agora.getDate() + i);
    const diaSemana = dataVerificada.getDay();
    
    const configuracoesDoDia = horariosConfig[diaSemana];
    
    if (configuracoesDoDia) {
      configuracoesDoDia.forEach(horario => {
        const dataMissa = new Date(dataVerificada);
        dataMissa.setHours(horario.hora, horario.minuto, 0, 0);
        
        if (dataMissa >= agora) {
          listaProximasMissas.push({
            data: dataMissa,
            diaTexto: diasSemanaPorExtenso[diaSemana],
            horaTexto: `${String(horario.hora).padStart(2, '0')}h${String(horario.minuto).padStart(2, '0')}`
          });
        }
      });
    }
  }

  listaProximasMissas.sort((a, b) => a.data - b.data);

  if (listaProximasMissas.length > 0) {
    const proxima = listaProximasMissas[0];
    let diaExibicao = proxima.diaTexto;
    
    if (proxima.data.toDateString() === agora.toDateString()) {
      diaExibicao = "Hoje";
    } else {
      const amanha = new Date(agora);
      amanha.setDate(agora.getDate() + 1);
      if (proxima.data.toDateString() === amanha.toDateString()) {
        diaExibicao = "Amanhã";
      }
    }

    textoElemento.innerHTML = ` ${diaExibicao} às ${proxima.horaTexto}`;
    
    const diferencaMs = proxima.data - agora;
    const diferencaHoras = Math.floor(diferencaMs / (1000 * 60 * 60));
    const diferencaMinutos = Math.floor((diferencaMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diaExibicao === "Hoje" && diferencaHoras === 0 && diferencaMinutos <= 10) {
      contadorElemento.innerHTML = `⚠️ A missa está prestes a começar ou já iniciou!`;
      contadorElemento.style.color = "#d32f2f";
    } else if (diferencaHoras === 0) {
      contadorElemento.innerHTML = `Faltam apenas ${diferencaMinutos} minutos.`;
      contadorElemento.style.color = "#666666";
    } else if (diferencaHoras < 24) {
      contadorElemento.innerHTML = `Faltam aproximadamente ${diferencaHoras}h e ${diferencaMinutos}min.`;
      contadorElemento.style.color = "#666666";
    } else {
      contadorElemento.innerHTML = `Data: ${proxima.data.toLocaleDateString('pt-BR')}`;
      contadorElemento.style.color = "#666666";
    }
  } else {
    textoElemento.innerText = "Nenhum horário de missa encontrado.";
    contadorElemento.innerText = "";
  }
}
let gravador;
let pedacosAudio = [];

const botaoIniciar = document.getElementById("startBtn");
const botaoParar = document.getElementById("stopBtn");
const textoStatus = document.getElementById("tela-status");

botaoIniciar.addEventListener("click", async () => {
  try {
    const fluxoSom = await navigator.mediaDevices.getUserMedia({ audio: true });
    gravador = new MediaRecorder(fluxoSom);
    pedacosAudio = [];
    gravador.ondataavailable = (evento) => {
      pedacosAudio.push(evento.data);
    };
    gravador.onstop = async () => {
      const arquivoAudio = new Blob(pedacosAudio, { type: "audio/webm" });
      await enviarParaAlfred(arquivoAudio);
    };
    gravador.start();
    botaoIniciar.classList.add("hidden");
    botaoParar.classList.remove("hidden");
    botaoParar.disabled = false;
    textoStatus.innerText = "Alfred está ouvindo...";
    textoStatus.style.color = "#ff4b4b";
  } catch (erro) {
    console.error("Erro no microfone:", erro);
    alert("Erro Alfred não conseguiu acessar o microfone.");
  }
});

botaoParar.addEventListener("click", () => {
  gravador.stop();
  gravador.stream.getTracks().forEach((trilha) => trilha.stop());
  botaoParar.classList.add("hidden");
  botaoIniciar.classList.remove("hidden");
  textoStatus.innerText = "Alfred está processando o áudio...";
  textoStatus.style.color = "#4b99ff";
});

async function enviarParaAlfred(blob) {
  const linkWebhook =
    "https://hook.us2.make.com/wjwx83x55lurzweluhlagg98jdaf9rt3";

  const dadosEnvio = new FormData();
  dadosEnvio.append("audio", blob, "comando_voz.webm");

  try {
    const resposta = await fetch(linkWebhook, {
      method: "POST",
      body: dadosEnvio,
    });

    if (resposta.ok) {
      const textoFinal = await resposta.text();
      textoStatus.innerText = "Alfred: " + textoFinal;
      textoStatus.style.color = "#45f542";
    } else {
      textoStatus.innerText = "Erro no servidor do Alfred.";
    }
  } catch (erroConexao) {
    console.error("Erro no envio:", erroConexao);
    textoStatus.innerText = "falha na conexão";
  }
}

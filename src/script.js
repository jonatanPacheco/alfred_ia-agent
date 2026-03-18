const GRID_SIZE = 12;
const leds = [];
const gridElement = document.getElementById("led-grid");

const olhos = [39, 40, 51, 52, 43, 44, 55, 56];
const bocaBase = [100, 101, 102, 103];

function criarGrade() {
  if (leds.length > 0) return;
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const led = document.createElement("div");
    led.classList.add("led");
    gridElement.appendChild(led);
    leds.push(led);
  }
}

function mudarFace(tipo, volume = 0) {
  leds.forEach((l) => {
    l.classList.remove("on", "error");
  });
  olhos.forEach((id) =>
    leds[id].classList.add(tipo === "error" ? "error" : "on"),
  );

  if (tipo === "fala") {
    const altura = Math.floor(volume / 10);
    bocaBase.forEach((id) => {
      leds[id].classList.add("on");
      if (altura > 1) {
        leds[id - 12].classList.add("on");
        leds[id + 12].classList.add("on");
      }
    });
  } else if (tipo === "sucesso") {
    [99, 112, 113, 114, 115, 104].forEach((id) => leds[id].classList.add("on"));
  } else if (tipo === "erro") {
    [88, 101, 102, 115, 91, 104, 103, 112].forEach((id) =>
      leds[id].classList.add("error"),
    );
  } else {
    bocaBase.forEach((id) => leds[id].classList.add("on"));
  }
}

let gravador;
let pedacosAudio = [];
let audioCtx;
let analisador;
let animId;

const botaoIniciar = document.getElementById("startBtn");
const botaoParar = document.getElementById("stopBtn");
const textoStatus = document.getElementById("tela-status");

async function alfredFala(texto) {
  return new Promise((resolve) => {
    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = "pt-BR";
    msg.onstart = () => {
      const loopFala = () => {
        mudarFace("fala", Math.random() * 50 + 20);
        animId = requestAnimationFrame(loopFala);
      };
      loopFala();
    };
    msg.onend = () => {
      cancelAnimationFrame(animId);
      mudarFace("neutro");
      resolve();
    };
    window.speechSynthesis.speak(msg);
  });
}

botaoIniciar.addEventListener("click", async () => {
  try {
    criarGrade();
    const fluxoSom = await navigator.mediaDevices.getUserMedia({ audio: true });
    await alfredFala("simm Patrão Jonatan.");
    gravador = new MediaRecorder(fluxoSom);
    pedacosAudio = [];

    audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(fluxoSom);
    analisador = audioCtx.createAnalyser();
    source.connect(analisador);
    const dados = new Uint8Array(analisador.frequencyBinCount);

    const animarVozUsuario = () => {
      analisador.getByteFrequencyData(dados);
      const volume = dados.reduce((a, b) => a + b) / dados.length;
      mudarFace("fala", volume * 2);
      animId = requestAnimationFrame(animarVozUsuario);
    };
    animarVozUsuario();

    gravador.ondataavailable = (evento) => pedacosAudio.push(evento.data);
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
  cancelAnimationFrame(animId);
  if (audioCtx && audioCtx.state !== "closed") {
    audioCtx.close();
  }
  if (gravador && gravador.state !== "inactive") {
    gravador.stop();
    gravador.stream.getTracks().forEach((trilha) => trilha.stop());
  }

  botaoParar.classList.add("hidden");
  botaoIniciar.classList.remove("hidden");
  mudarFace("neutro");
  textoStatus.innerText = "Alfred está processando...";
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
      mudarFace("sucesso");
      const textoFinal = await resposta.text();
      textoStatus.innerText = "Alfred:" + textoFinal;
      await alfredFala("Ordem realizada com sucesso.");
    } else {
      mudarFace("erro");
      await alfredFala("Houve um erro no servidor, patrão.");
    }
  } catch (e) {
    mudarFace("erro");
  }
}

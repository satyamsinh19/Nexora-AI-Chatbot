// DOM Elements
const prompt = document.querySelector("#prompt");
const submitbtn = document.querySelector("#submit");
const chatContainer = document.getElementById("chatContainer");
const fileNameDisplay = document.getElementById("fileName");
const micbtn = document.getElementById("mic");
const removeImageBtn = document.getElementById("removeImage");
const removeFileBtn = document.getElementById("removeFile");
const clearBtn = document.getElementById("clearChat");
const historyList = document.getElementById("historyList");

const sidebar = document.getElementById("sidebar");
const openSidebarBtn = document.getElementById("openSidebar");
const toggleSidebarBtn = document.getElementById("toggleSidebar");
const container = document.getElementById("mainContainer");
const previewHolder = document.getElementById("previewHolder");

// New Inputs & Triggers
const imageBtn = document.getElementById("imageBtn");
const fileBtn = document.getElementById("fileBtn");
const imageinput = document.getElementById("imageInput");
const fileinput = document.getElementById("fileInput");

const Api_Url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBbBiBuGc0K5RLIn5Cn70dK5e_JmX9HbCc";

let user = {
  message: null,
  file: {
    mime_type: null,
    data: null
  }
};

function scrollChatToBottom() {
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
}

function resetInputs() {
  fileNameDisplay.textContent = "";
  previewHolder.style.display = "none";
  removeImageBtn.classList.add("hide");
  removeFileBtn.classList.add("hide");
  imageinput.value = "";
  fileinput.value = "";
  user.file = {};
}

function formatResponse(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/^\*\s+(.*)/gm, '• $1')
    .replace(/(?:\r\n|\r|\n)/g, "<br>");
}

function speakResponse(text) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utter);
  }
}

function appendToHistory(sender, html) {
  const history = JSON.parse(localStorage.getItem("chatHistory")) || [];
  history.push({ sender, html });
  localStorage.setItem("chatHistory", JSON.stringify(history));
  updateSidebar();
}

function updateSidebar() {
  const history = JSON.parse(localStorage.getItem("chatHistory")) || [];
  historyList.innerHTML = "";
  history.forEach(item => {
    const plain = item.html.replace(/<[^>]+>/g, '').substring(0, 35).trim() + "...";
    const entry = document.createElement("div");
    entry.classList.add("history-entry");
    entry.textContent = (item.sender === "user" ? "You: " : "AI: ") + plain;
    historyList.appendChild(entry);
  });
}

function loadChatHistory() {
  const history = JSON.parse(localStorage.getItem("chatHistory")) || [];
  history.forEach(item => {
    chatContainer.insertAdjacentHTML("beforeend", item.html);
  });
  updateSidebar();
  scrollChatToBottom();
}

function createAIBox() {
  const aiBox = document.createElement("div");
  aiBox.className = "chat-box ai-chat-box";
  aiBox.innerHTML = `
    <img src="ai.png" alt="" class="avatar left">
    <div class="chat-bubble ai-chat-area">
      <img src="loading.webp" width="40px">
    </div>`;
  return aiBox;
}

function handlechatResponse(userMessage) {
  speechSynthesis.cancel();
  user.message = userMessage;

  const attachedFile = { ...user.file }; // ✅ Save file before reset

  let previewHTML = "";
  if (attachedFile.data) {
    if (attachedFile.mime_type.startsWith("image/")) {
      previewHTML = `<div class="preview-section"><img src="data:${attachedFile.mime_type};base64,${attachedFile.data}" /></div>`;
    } else if (attachedFile.mime_type === "application/pdf") {
      previewHTML = `<div class="preview-section"><div class="file-preview">📄 PDF: Uploaded</div></div>`;
    }
  }

  const html = `
    ${previewHTML}
    <div class="chat-box user-chat-box">
      <img src="user.png" alt="" class="avatar right">
      <div class="chat-bubble user-chat-area">${user.message}</div>
    </div>`;

  prompt.value = "";
  chatContainer.insertAdjacentHTML("beforeend", html);
  appendToHistory("user", html);
  scrollChatToBottom();
  resetInputs(); // ✅ Clear preview immediately

  const aiBox = createAIBox();
  chatContainer.appendChild(aiBox);
  generateResponse(aiBox.querySelector(".ai-chat-area"), aiBox, attachedFile); // ✅ Send preserved file
}

function generateResponse(targetElement, box, fileData) {
  const request = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: user.message },
          ...(fileData?.data ? [{ inline_data: fileData }] : [])
        ]
      }]
    })
  };

  fetch(Api_Url, request)
    .then(res => res.json())
    .then(data => {
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
      const formatted = formatResponse(raw);
      targetElement.innerHTML = formatted;
      speakResponse(raw);
      appendToHistory("ai", box.outerHTML);
    })
    .catch(err => {
      console.error(err);
      targetElement.innerHTML = "❌ Error receiving response.";
    })
    .finally(() => {
      scrollChatToBottom();
    });
}

// === Event Listeners ===
submitbtn.addEventListener("click", () => handlechatResponse(prompt.value));
prompt.addEventListener("keydown", e => {
  if (e.key === "Enter") handlechatResponse(prompt.value);
});

// 📸 Image Upload
imageBtn.addEventListener("click", () => imageinput.click());
imageinput.addEventListener("change", () => {
  const file = imageinput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    user.file = { mime_type: file.type, data: e.target.result.split(",")[1] };
    fileNameDisplay.innerHTML = `<img src="data:${file.type};base64,${user.file.data}">`;
    previewHolder.style.display = "block";
    removeImageBtn.classList.remove("hide");
  };
  reader.readAsDataURL(file);
});

// 📄 File Upload
fileBtn.addEventListener("click", () => fileinput.click());
fileinput.addEventListener("change", () => {
  const file = fileinput.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Only PDF files allowed.");
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    user.file = { mime_type: file.type, data: e.target.result.split(",")[1] };
    fileNameDisplay.textContent = `📄 ${file.name}`;
    previewHolder.style.display = "block";
    removeFileBtn.classList.remove("hide");
  };
  reader.readAsDataURL(file);
});

removeImageBtn.addEventListener("click", resetInputs);
removeFileBtn.addEventListener("click", resetInputs);

clearBtn.addEventListener("click", () => {
  if (confirm("Clear all chat?")) {
    localStorage.removeItem("chatHistory");
    chatContainer.innerHTML = `
      <div class="chat-box ai-chat-box">
        <img src="ai.png" alt="" class="avatar left">
        <div class="chat-bubble ai-chat-area">Hello! How can I help you today?</div>
      </div>`;
    updateSidebar();
    resetInputs();
  }
});

toggleSidebarBtn.addEventListener("click", () => {
  sidebar.classList.add("hidden");
  openSidebarBtn.style.display = "block";
  container.classList.add("sidebar-collapsed");
});

openSidebarBtn.addEventListener("click", () => {
  sidebar.classList.remove("hidden");
  openSidebarBtn.style.display = "none";
  container.classList.remove("sidebar-collapsed");
});

// 🎤 Voice Input
let recognition;
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => micbtn.classList.add("listening");
  recognition.onend = () => micbtn.classList.remove("listening");
  recognition.onerror = e => console.error(e.error);
  recognition.onresult = e => {
    const transcript = e.results[0][0].transcript;
    prompt.value = transcript;
    handlechatResponse(transcript);
  };
}
micbtn.addEventListener("click", () => {
  if (recognition) recognition.start();
});

window.addEventListener("load", () => {
  loadChatHistory();
  previewHolder.style.display = "none";
});

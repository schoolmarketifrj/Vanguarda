import { firebaseConfig } from "./firebase-config.js";

const FIREBASE_VERSION = "11.10.0";
const COLLECTION_NAME = "siteContent";
const EDITORS_COLLECTION = "siteEditors";
const ADMIN_EMAIL = "CLX@gmail.com";
const TYPE_LABELS = {
  complaint: "Caixa de reclamação",
  anonymous: "Denúncia anônima",
  suggestion: "Sugestão de melhoria",
  resource: "Material ou link útil",
  email: "E-mail de professor(a)",
  event: "Ação do grêmio",
};
const TYPE_ICONS = {
  complaint: "↗",
  anonymous: "◉",
  suggestion: "✳",
  resource: "↗",
  email: "✉",
  event: "✳",
};
const demoContent = [
  {
    id: "demo-complaint",
    type: "complaint",
    title: "Caixa de reclamação",
    description: "Conte pra gente o que pode melhorar na escola.",
    url: "",
  },
  {
    id: "demo-anonymous",
    type: "anonymous",
    title: "Denúncia anônima",
    description: "Um canal reservado para compartilhar uma preocupação.",
    url: "",
  },
  {
    id: "demo-suggestion",
    type: "suggestion",
    title: "O que pode melhorar?",
    description: "Sua ideia pode virar a próxima ação do grêmio.",
    url: "",
  },
];

const state = {
  content: [],
  filter: "all",
  auth: null,
  firestore: null,
  unsubscribeContent: null,
  unsubscribeEditors: null,
  signedInUser: null,
  isAdmin: false,
  configured: false,
};

const elements = {
  loginModal: document.querySelector("#login-modal"),
  loginForm: document.querySelector("#login-form"),
  loginFeedback: document.querySelector("#login-feedback"),
  signupForm: document.querySelector("#signup-form"),
  adminPanel: document.querySelector("#admin-panel"),
  contentForm: document.querySelector("#content-form"),
  contentFeedback: document.querySelector("#content-feedback"),
  adminContentItems: document.querySelector("#admin-content-items"),
  participationCards: document.querySelector("#participation-cards"),
  resourceCards: document.querySelector("#resource-cards"),
  agendaCards: document.querySelector("#agenda-cards"),
  siteStatus: document.querySelector("#site-status"),
  inviteForm: document.querySelector("#invite-form"),
  inviteFeedback: document.querySelector("#invite-feedback"),
  inviteItems: document.querySelector("#invite-items"),
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function validUrl(value) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return ["https:", "http:", "mailto:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function sortedContent(content) {
  return [...content].sort((a, b) => {
    const first = a.createdAt?.toMillis?.() ?? 0;
    const second = b.createdAt?.toMillis?.() ?? 0;
    return second - first;
  });
}

function contentLink(item, label = "Acessar") {
  const url = validUrl(item.url);
  if (!url) return "";
  const external = !url.startsWith("mailto:");
  return `<a class="card-link" href="${escapeHtml(url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label} <span aria-hidden="true">↗</span></a>`;
}

function renderParticipation() {
  const items = state.content.filter((item) => ["complaint", "anonymous", "suggestion"].includes(item.type));
  const accentClasses = ["card-accent-mint", "card-accent-yellow", "card-accent-lilac"];
  elements.participationCards.innerHTML = items.length
    ? items.map((item, index) => `
        <article class="participation-card ${accentClasses[index % accentClasses.length]}">
          <div class="card-topline"><span>${escapeHtml(TYPE_LABELS[item.type])}</span><span aria-hidden="true">${TYPE_ICONS[item.type]}</span></div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description || "")}</p>
          ${contentLink(item, "Abrir formulário") || '<span class="card-pending">Link em breve</span>'}
        </article>
      `).join("")
    : '<p class="empty-state">Os canais de participação serão publicados em breve.</p>';
}

function renderResources() {
  const items = sortedContent(state.content.filter((item) => ["resource", "email"].includes(item.type)))
    .filter((item) => state.filter === "all" || item.type === state.filter);
  elements.resourceCards.innerHTML = items.length
    ? items.map((item) => `
        <article class="resource-card">
          <span class="resource-icon" aria-hidden="true">${TYPE_ICONS[item.type]}</span>
          <div class="resource-copy">
            <span class="resource-type">${escapeHtml(TYPE_LABELS[item.type])}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description || "")}</p>
            ${contentLink(item, item.type === "email" ? "Enviar e-mail" : "Abrir material")}
          </div>
        </article>
      `).join("")
    : '<p class="empty-state">Ainda não há materiais ou contatos publicados nesta categoria.</p>';
}

function renderAgenda() {
  const items = sortedContent(state.content.filter((item) => item.type === "event"));
  elements.agendaCards.innerHTML = items.length
    ? items.map((item, index) => `
        <article class="agenda-card">
          <span class="agenda-number">${String(index + 1).padStart(2, "0")}</span>
          <div><span class="agenda-label">NOVIDADE DO GRÊMIO</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || "")}</p></div>
          ${contentLink(item, "Saiba mais")}
        </article>
      `).join("")
    : '<p class="agenda-empty">As próximas ações do grêmio aparecem aqui.<br /><span>Volte em breve para conferir as novidades.</span></p>';
}

function renderAdminItems() {
  if (!state.signedInUser) return;
  const content = sortedContent(state.content);
  elements.adminContentItems.innerHTML = content.length
    ? content.map((item) => `
        <article class="admin-item">
          <div><span>${escapeHtml(TYPE_LABELS[item.type] || "Conteúdo")}</span><strong>${escapeHtml(item.title)}</strong></div>
          <div class="admin-item-actions">
            <button type="button" data-action="edit" data-id="${escapeHtml(item.id)}">Editar</button>
            <button type="button" data-action="delete" data-id="${escapeHtml(item.id)}">Excluir</button>
          </div>
        </article>
      `).join("")
    : '<p class="empty-state">Nenhum conteúdo publicado ainda.</p>';
}

function renderInvites(invites) {
  elements.inviteItems.innerHTML = invites.length
    ? invites.map((invite) => `
        <article class="admin-item">
          <div><span>${invite.active ? "Acesso autorizado" : "Acesso revogado"}</span><strong>${escapeHtml(invite.email)}</strong></div>
          <div class="admin-item-actions">
            ${invite.active ? `<button type="button" data-invite-action="revoke" data-email="${escapeHtml(invite.email)}">Revogar acesso</button>` : ""}
          </div>
        </article>
      `).join("")
    : '<p class="empty-state">Nenhum acesso adicional autorizado.</p>';
}

function render() {
  renderParticipation();
  renderResources();
  renderAgenda();
  renderAdminItems();
}

function showStatus(message, kind = "info") {
  elements.siteStatus.textContent = message;
  elements.siteStatus.dataset.kind = kind;
  elements.siteStatus.classList.add("is-visible");
  window.clearTimeout(showStatus.timeout);
  showStatus.timeout = window.setTimeout(() => elements.siteStatus.classList.remove("is-visible"), 4500);
}

function showLoginFeedback(message, isError = false) {
  elements.loginFeedback.textContent = message;
  elements.loginFeedback.dataset.kind = isError ? "error" : "success";
}

function resetContentForm() {
  elements.contentForm.reset();
  document.querySelector("#content-id").value = "";
  document.querySelector("#save-content").innerHTML = 'Publicar conteúdo <span aria-hidden="true">→</span>';
  document.querySelector("#cancel-edit").hidden = true;
}

function openLogin() {
  if (!state.configured) {
    showLoginFeedback("A integração ainda está aguardando as configurações do Firebase.");
  } else {
    showLoginFeedback("");
  }
  elements.loginModal.hidden = false;
  document.querySelector("#admin-email").focus();
}

function closeLogin() {
  elements.loginModal.hidden = true;
  elements.loginForm.reset();
  elements.signupForm.reset();
  elements.loginForm.hidden = false;
  elements.signupForm.hidden = true;
  document.querySelector("#show-signup").hidden = false;
  document.querySelector("#show-login").hidden = true;
  showLoginFeedback("");
}

function setSignedInUser(user, isAdmin = false) {
  state.signedInUser = user;
  state.isAdmin = Boolean(user && isAdmin);
  elements.adminPanel.hidden = !user;
  document.querySelector("#invite-admin").hidden = !state.isAdmin;
  document.querySelector("#open-login").hidden = Boolean(user);
  document.querySelector("#open-login-mobile").hidden = Boolean(user);
  if (user) {
    closeLogin();
    elements.adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    resetContentForm();
  }
  renderAdminItems();
}

async function handleAuthState(user, authSdk) {
  if (state.unsubscribeContent) state.unsubscribeContent();
  if (state.unsubscribeEditors) state.unsubscribeEditors();
  state.unsubscribeContent = null;
  state.unsubscribeEditors = null;

  if (!user) {
    state.content = [];
    setSignedInUser(null);
    render();
    return;
  }

  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  let hasAccess = isAdmin;
  if (!isAdmin && user.email) {
    try {
      const invite = await state.firestore.getDoc(
        state.firestore.doc(state.firestore.database, EDITORS_COLLECTION, user.email.toLowerCase()),
      );
      hasAccess = invite.exists() && invite.data().active === true;
    } catch (error) {
      console.error("Falha ao verificar o convite da conta.", error);
    }
  }

  if (!hasAccess) {
    setSignedInUser(null);
    showStatus("Este e-mail não tem um convite ativo. Peça ao administrador para autorizá-lo.", "error");
    try {
      await authSdk.signOut(state.auth);
    } catch (error) {
      console.error("Falha ao encerrar uma sessão sem convite válido.", error);
      showStatus(`Não foi possível encerrar a sessão: ${error.message}`, "error");
    }
    return;
  }

  setSignedInUser(user, isAdmin);
  state.unsubscribeContent = state.firestore.onSnapshot(
    state.firestore.collection(state.firestore.database, COLLECTION_NAME),
    (snapshot) => {
      state.content = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      render();
    },
    (error) => showStatus(`Não foi possível carregar o conteúdo: ${error.message}`, "error"),
  );

  if (isAdmin) {
    state.unsubscribeEditors = state.firestore.onSnapshot(
      state.firestore.collection(state.firestore.database, EDITORS_COLLECTION),
      (snapshot) => renderInvites(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))),
      (error) => {
        const email = state.auth.currentUser?.email || "desconhecida";
        console.error(`Falha ao listar convites para ${email}.`, error);
        showStatus(
          `A conta ${email} não pode ler a lista de acessos. Confirme que publicou as regras atuais no projeto site-principal-da-vanguarda e que o administrador é CLX@gmail.com.`,
          "error",
        );
      },
    );
  }
}

async function initializeFirebase() {
  const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
  if (!isConfigured) {
    state.content = demoContent;
    render();
    return;
  }

  state.configured = true;
  try {
    const [appSdk, authSdk, firestoreSdk] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
    ]);
    const app = appSdk.initializeApp(firebaseConfig);
    state.auth = authSdk.getAuth(app);
    state.firestore = { ...firestoreSdk, database: firestoreSdk.getFirestore(app) };
    authSdk.onAuthStateChanged(state.auth, (user) => {
      handleAuthState(user, authSdk).catch((error) => {
        console.error("Falha ao verificar o acesso à área administrativa.", error);
        showStatus(`Não foi possível verificar seu acesso: ${error.message}`, "error");
      });
    });
    state.content = [];
    render();
  } catch (error) {
    console.error("Falha ao iniciar o Firebase.", error);
    showStatus("Não foi possível conectar ao Firebase. Confira as configurações do projeto.", "error");
  }
}

async function submitLogin(event) {
  event.preventDefault();
  if (!state.auth) {
    showLoginFeedback("O Firebase ainda não está disponível. Confira as configurações e a conexão do projeto.", true);
    return;
  }
  const formData = new FormData(elements.loginForm);
  try {
    const { signInWithEmailAndPassword } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    await signInWithEmailAndPassword(state.auth, formData.get("email"), formData.get("password"));
  } catch (error) {
    console.error("Falha no login administrativo.", error);
    const message = ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(error.code)
      ? "E-mail ou senha incorretos, ou esta conta ainda não foi criada no Firebase Authentication. Confira Authentication > Users."
      : error.code === "auth/too-many-requests"
        ? "Muitas tentativas de login. Aguarde um pouco e tente novamente."
        : "Não foi possível entrar. Confira se o login por e-mail e senha está habilitado no Firebase Authentication.";
    showLoginFeedback(message, true);
  }
}

async function sendPasswordReset() {
  if (!state.auth) {
    showLoginFeedback("O Firebase ainda não está disponível. Tente novamente mais tarde.", true);
    return;
  }
  const emailInput = document.querySelector("#admin-email");
  const email = emailInput.value.trim();
  if (!email || !emailInput.validity.valid) {
    showLoginFeedback("Digite o e-mail da conta no campo acima para receber a redefinição.", true);
    emailInput.focus();
    return;
  }
  try {
    const { sendPasswordResetEmail } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    await sendPasswordResetEmail(state.auth, email);
    showLoginFeedback("Se este e-mail estiver cadastrado, o Firebase enviará um link para redefinir a senha. Confira também o spam.");
  } catch (error) {
    console.error("Falha ao enviar link de redefinição de senha.", error);
    const message = error.code === "auth/invalid-email"
      ? "Digite um endereço de e-mail válido."
      : error.code === "auth/too-many-requests"
        ? "Muitas tentativas. Aguarde um pouco antes de pedir outro link."
        : "Não foi possível enviar o link. Confira se E-mail/senha está habilitado no Firebase Authentication.";
    showLoginFeedback(message, true);
  }
}

async function submitSignup(event) {
  event.preventDefault();
  if (!state.auth || !state.firestore) {
    showLoginFeedback("O Firebase ainda não está disponível. Tente novamente mais tarde.", true);
    return;
  }
  const formData = new FormData(elements.signupForm);
  const email = String(formData.get("email")).trim().toLowerCase();
  const password = String(formData.get("password"));
  const passwordConfirm = String(formData.get("passwordConfirm"));
  if (password !== passwordConfirm) {
    showLoginFeedback("As senhas não coincidem.", true);
    return;
  }

  try {
    const { createUserWithEmailAndPassword } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    await createUserWithEmailAndPassword(state.auth, email, password);
    showLoginFeedback("Conta criada. Verificando se o administrador autorizou este e-mail.");
  } catch (error) {
    console.error("Falha ao criar uma conta de editor.", error);
    const message = error.code === "auth/email-already-in-use"
      ? "Já existe uma conta com este e-mail. Tente entrar."
      : error.code === "auth/weak-password"
        ? "Escolha uma senha com pelo menos 6 caracteres."
        : "Não foi possível criar a conta. Confira os dados e tente novamente.";
    showLoginFeedback(message, true);
  }
}

async function submitContent(event) {
  event.preventDefault();
  if (!state.firestore || !state.signedInUser) return;
  const formData = new FormData(elements.contentForm);
  const type = String(formData.get("type"));
  const url = String(formData.get("url")).trim();
  if (url && !validUrl(url)) {
    elements.contentFeedback.textContent = "Use um endereço válido começando com http://, https:// ou mailto:.";
    elements.contentFeedback.dataset.kind = "error";
    return;
  }
  if (!url && type !== "event") {
    elements.contentFeedback.textContent = "Adicione o link do formulário, material ou contato.";
    elements.contentFeedback.dataset.kind = "error";
    return;
  }
  const item = {
    title: String(formData.get("title")).trim(),
    description: String(formData.get("description")).trim(),
    type,
    url,
    updatedAt: state.firestore.serverTimestamp(),
  };
  const id = String(formData.get("id"));
  try {
    if (id) {
      const existingItem = state.content.find((entry) => entry.id === id);
      if (!existingItem?.createdAt) {
        throw new Error("Não foi possível atualizar: a data de criação deste conteúdo não está disponível.");
      }
      item.createdAt = existingItem.createdAt;
      await state.firestore.updateDoc(state.firestore.doc(state.firestore.database, COLLECTION_NAME, id), item);
    } else {
      item.createdAt = state.firestore.serverTimestamp();
      await state.firestore.addDoc(state.firestore.collection(state.firestore.database, COLLECTION_NAME), item);
    }
    resetContentForm();
    elements.contentFeedback.textContent = "Conteúdo salvo com sucesso.";
    elements.contentFeedback.dataset.kind = "success";
  } catch (error) {
    console.error("Falha ao salvar conteúdo.", error);
    elements.contentFeedback.textContent = `Não foi possível salvar. Confira as regras do Firestore: ${error.message}`;
    elements.contentFeedback.dataset.kind = "error";
  }
}

async function submitInvite(event) {
  event.preventDefault();
  if (!state.firestore || !state.isAdmin) return;
  const formData = new FormData(elements.inviteForm);
  const email = String(formData.get("email")).trim().toLowerCase();
  if (email === ADMIN_EMAIL.toLowerCase()) {
    elements.inviteFeedback.textContent = "Esta conta já é a administradora principal.";
    elements.inviteFeedback.dataset.kind = "error";
    return;
  }
  try {
    const reference = state.firestore.doc(state.firestore.database, EDITORS_COLLECTION, email);
    await state.firestore.setDoc(reference, {
      email,
      active: true,
      createdAt: state.firestore.serverTimestamp(),
    });
    elements.inviteForm.reset();
    elements.inviteFeedback.textContent = "E-mail autorizado. A pessoa pode criar a senha em “Tem convite? Criar acesso”.";
    elements.inviteFeedback.dataset.kind = "success";
  } catch (error) {
    console.error("Falha ao autorizar um e-mail.", error);
    elements.inviteFeedback.textContent = error.code === "permission-denied"
      ? "O Firestore bloqueou esta ação. Publique as regras atualizadas de firestore.rules em Firebase Console > Firestore Database > Regras e confira se a conta conectada é CLX@gmail.com."
      : `Não foi possível autorizar o e-mail: ${error.message}`;
    elements.inviteFeedback.dataset.kind = "error";
  }
}

async function handleAdminItemAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button || !state.firestore || !state.signedInUser) return;
  const item = state.content.find((entry) => entry.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === "edit") {
    document.querySelector("#content-id").value = item.id;
    document.querySelector("#content-title").value = item.title || "";
    document.querySelector("#content-type").value = item.type;
    document.querySelector("#content-description").value = item.description || "";
    document.querySelector("#content-url").value = item.url || "";
    document.querySelector("#save-content").innerHTML = 'Salvar alterações <span aria-hidden="true">→</span>';
    document.querySelector("#cancel-edit").hidden = false;
    elements.contentForm.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (button.dataset.action === "delete" && window.confirm(`Excluir "${item.title}"?`)) {
    try {
      await state.firestore.deleteDoc(state.firestore.doc(state.firestore.database, COLLECTION_NAME, item.id));
    } catch (error) {
      console.error("Falha ao excluir conteúdo.", error);
      showStatus(`Não foi possível excluir: ${error.message}`, "error");
    }
  }
}

async function handleInviteAction(event) {
  const button = event.target.closest("button[data-invite-action='revoke']");
  if (!button || !state.firestore || !state.isAdmin) return;
  const email = button.dataset.email;
  if (!email || !window.confirm(`Revogar o acesso de ${email}?`)) return;
  try {
    await state.firestore.deleteDoc(state.firestore.doc(state.firestore.database, EDITORS_COLLECTION, email));
  } catch (error) {
    console.error("Falha ao revogar acesso.", error);
    showStatus(`Não foi possível revogar o acesso: ${error.message}`, "error");
  }
}

async function logout() {
  if (!state.auth) return;
  try {
    const { signOut } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    await signOut(state.auth);
  } catch (error) {
    console.error("Falha ao sair da área administrativa.", error);
    showStatus(`Não foi possível encerrar a sessão: ${error.message}`, "error");
  }
}

document.querySelector("#open-login").addEventListener("click", openLogin);
document.querySelector("#open-login-mobile").addEventListener("click", () => {
  document.querySelector("#mobile-nav").hidden = true;
  document.querySelector("#menu-toggle").setAttribute("aria-expanded", "false");
  openLogin();
});
document.querySelector("#close-login").addEventListener("click", closeLogin);
elements.loginModal.addEventListener("click", (event) => {
  if (event.target === elements.loginModal) closeLogin();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.loginModal.hidden) closeLogin();
});
elements.loginForm.addEventListener("submit", submitLogin);
document.querySelector("#reset-password").addEventListener("click", sendPasswordReset);
elements.signupForm.addEventListener("submit", submitSignup);
elements.contentForm.addEventListener("submit", submitContent);
elements.adminContentItems.addEventListener("click", handleAdminItemAction);
elements.inviteForm.addEventListener("submit", submitInvite);
elements.inviteItems.addEventListener("click", handleInviteAction);
document.querySelector("#show-signup").addEventListener("click", () => {
  elements.loginForm.hidden = true;
  elements.signupForm.hidden = false;
  document.querySelector("#show-signup").hidden = true;
  document.querySelector("#show-login").hidden = false;
  showLoginFeedback("");
  document.querySelector("#signup-email").focus();
});
document.querySelector("#show-login").addEventListener("click", () => {
  elements.loginForm.hidden = false;
  elements.signupForm.hidden = true;
  document.querySelector("#show-signup").hidden = false;
  document.querySelector("#show-login").hidden = true;
  showLoginFeedback("");
  document.querySelector("#admin-email").focus();
});
document.querySelector("#cancel-edit").addEventListener("click", resetContentForm);
document.querySelector("#logout-button").addEventListener("click", logout);
document.querySelectorAll(".filter-chip").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
    renderResources();
  });
});
document.querySelectorAll(".mobile-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelector("#mobile-nav").hidden = true;
    document.querySelector("#menu-toggle").setAttribute("aria-expanded", "false");
  });
});
document.querySelector("#menu-toggle").addEventListener("click", (event) => {
  const menu = document.querySelector("#mobile-nav");
  const expanded = event.currentTarget.getAttribute("aria-expanded") === "true";
  event.currentTarget.setAttribute("aria-expanded", String(!expanded));
  event.currentTarget.setAttribute("aria-label", expanded ? "Abrir menu" : "Fechar menu");
  menu.hidden = expanded;
});
document.querySelector("#current-year").textContent = new Date().getFullYear();

initializeFirebase();

const form = document.querySelector("#claim-form");
const nameInput = document.querySelector("#name");
const submitButton = document.querySelector("#submit-button");
const errorMessage = document.querySelector("#error-message");
const messagePanel = document.querySelector("#message-panel");
const messageTitle = document.querySelector("#message-title");
const messageBody = document.querySelector("#message-body");
const pageTitle = document.querySelector("#page-title");
const pageIntro = document.querySelector("#page-intro");
const adminToggle = document.querySelector("#admin-toggle");
const adminPanel = document.querySelector("#admin-panel");
const adminPasswordInput = document.querySelector("#admin-password");
const adminLoginButton = document.querySelector("#admin-login");
const adminActions = document.querySelector("#admin-actions");
const adminResetButton = document.querySelector("#admin-reset");
const adminError = document.querySelector("#admin-error");

let adminPassword = "";

const successMessage = {
  title: "You found us!",
  body: "Check with Liz at check in or in the dining room to claim your homemade cheese cake.",
};

const closedMessage = {
  title: "Sorry, we have already been found.",
  body: "Try and find us next year!",
};

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function clearError() {
  errorMessage.textContent = "";
  errorMessage.classList.add("hidden");
}

function showAdminError(message) {
  adminError.textContent = message;
  adminError.classList.remove("hidden");
}

function clearAdminError() {
  adminError.textContent = "";
  adminError.classList.add("hidden");
}

function applyClosedState() {
  clearError();
  pageTitle.textContent = closedMessage.title;
  pageIntro.textContent = closedMessage.body;
  form.classList.add("hidden");
  messagePanel.classList.add("hidden");
}

function showMessage(message) {
  if (message === closedMessage) {
    applyClosedState();
    return;
  }

  form.classList.add("hidden");

  messageTitle.textContent = message.title;
  messageBody.textContent = message.body;
  messagePanel.classList.remove("hidden");
}

function applyOpenState() {
  pageTitle.textContent = "Chuck & Jo Ann sent you here.";
  pageIntro.textContent =
    "Enter your name below to claim the prize if you found the hidden sign.";
  form.classList.remove("hidden");
  messagePanel.classList.add("hidden");
}

async function loadStatus() {
  try {
    const response = await fetch("/api/status");
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    if (data.claimed) {
      showMessage(closedMessage);
    }
  } catch (error) {
    console.error("Unable to load status", error);
  }
}

adminToggle.addEventListener("click", () => {
  adminPanel.classList.toggle("hidden");
  clearAdminError();
});

adminLoginButton.addEventListener("click", () => {
  clearAdminError();

  const password = adminPasswordInput.value;
  if (password !== "Golf2026") {
    showAdminError("Incorrect password.");
    return;
  }

  adminPassword = password;
  adminPasswordInput.value = "";
  adminActions.classList.remove("hidden");
});

adminResetButton.addEventListener("click", async () => {
  clearAdminError();
  adminResetButton.disabled = true;
  adminResetButton.textContent = "Resetting...";

  try {
    const response = await fetch("/api/reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: adminPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      showAdminError(data.error || "Could not reset the claim.");
      return;
    }

    applyOpenState();
    nameInput.value = "";
  } catch (error) {
    console.error("Reset failed", error);
    showAdminError("Could not reset the claim.");
  } finally {
    adminResetButton.disabled = false;
    adminResetButton.textContent = "Reset Claimed";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const name = nameInput.value.trim();
  if (!name) {
    showError("Please enter your name before submitting.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    const response = await fetch("/api/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    const data = await response.json();

    if (response.ok && data.status === "claimed") {
      showMessage(successMessage);
      return;
    }

    if (response.status === 409 && data.status === "already_claimed") {
      showMessage(closedMessage);
      return;
    }

    showError(data.error || "Something went wrong. Please try again.");
  } catch (error) {
    console.error("Submit failed", error);
    showError("Something went wrong. Please try again.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit";
  }
});

loadStatus();

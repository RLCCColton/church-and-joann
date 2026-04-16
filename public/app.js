const form = document.querySelector("#claim-form");
const nameInput = document.querySelector("#name");
const submitButton = document.querySelector("#submit-button");
const errorMessage = document.querySelector("#error-message");
const messagePanel = document.querySelector("#message-panel");
const messageTitle = document.querySelector("#message-title");
const messageBody = document.querySelector("#message-body");
const pageTitle = document.querySelector("#page-title");
const pageIntro = document.querySelector("#page-intro");

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

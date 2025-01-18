document.addEventListener("DOMContentLoaded", function () {
  // Use buttons to toggle between views
  document
    .querySelector("#inbox")
    .addEventListener("click", () => load_mailbox("inbox"));
  document
    .querySelector("#sent")
    .addEventListener("click", () => load_mailbox("sent"));
  document
    .querySelector("#archived")
    .addEventListener("click", () => load_mailbox("archive"));
  document.querySelector("#compose").addEventListener("click", compose_email);

  document.querySelector("#compose-form").onsubmit = compose_submit;

  // By default, load the inbox
  load_mailbox("inbox");
});

// -----------------------------------------------------------------------------------
function compose_email() {
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "block";
  document.querySelector("#email-container-view").style.display = "none";

  // Clear out composition fields
  document.querySelector("#compose-recipients").value = "";
  document.querySelector("#compose-subject").value = "";
  document.querySelector("#compose-body").value = "";
}

function compose_submit() {
  const compose_recipients = document.querySelector(
    "#compose-recipients"
  ).value;
  const compose_subject = document.querySelector("#compose-subject").value;
  const compose_body = document.querySelector("#compose-body").value;

  const bodyData = JSON.stringify({
    recipients: compose_recipients,
    subject: compose_subject,
    body: compose_body,
  });

  fetch("/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: bodyData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to send email");
      }
      return response.json();
    })
    .then((result) => {
      load_mailbox("sent");
    })
    .catch((error) => {
      alert("An error occurred while sending the email.");
    });

  return false;
}

function load_mailbox(mailbox) {
  fetch(`/emails/${mailbox}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load mailbox");
      }
      return response.json();
    })
    .then((emails) => {
      const emailsView = document.getElementById("emails-view");
      emailsView.innerHTML = "";

      const mailboxTitle = document.createElement("h3");
      mailboxTitle.textContent = capitalize(mailbox);
      emailsView.appendChild(mailboxTitle);

      for (const email of emails) {
        const emailItem = create_email_element(email, mailbox);
        emailsView.appendChild(emailItem);
      }
    })
    .catch((error) => {
      alert("An error occurred while loading the mailbox.");
    });

  const views = {
    emails: document.getElementById("emails-view"),
    compose: document.getElementById("compose-view"),
    emailContainer: document.getElementById("email-container-view"),
  };

  Object.keys(views).forEach((key) => {
    views[key].style.display = key === "emails" ? "block" : "none";
  });
}

function create_email_element(email, mailbox) {
  const emailDiv = document.createElement("div");
  emailDiv.classList.add(
    "email",
    "container",
    "border",
    "rounded",
    "py-2",
    "px-3",
    "mb-2"
  );
  emailDiv.style.cursor = "pointer";
  emailDiv.style.maxWidth = "600px";

  if (email.read) {
    emailDiv.style.backgroundColor = "gray";
    emailDiv.style.color = "white";
  } else {
    emailDiv.style.backgroundColor = "white";
    emailDiv.style.color = "black";
  }

  emailDiv.innerHTML = `
    <div class="d-flex flex-column justify-content-between">
      <span class="fw-bold">${email.subject}</span>
      <div class="small">From: ${email.sender}</div>
      <span class="small">${email.timestamp}</span>
    </div>
  `;

  emailDiv.addEventListener("click", () => load_email(email.id, mailbox));

  return emailDiv;
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function load_email(id, mailbox) {
  const isSentMailbox = mailbox === "sent";

  document.querySelector("#email-container-view").style.display = "block";
  document.querySelector("#emails-view").style.display = "none";

  fetch(`/emails/${id}`, {
    method: "PUT",
    body: JSON.stringify({ read: true }),
  });

  fetch(`/emails/${id}`)
    .then((response) => response.json())
    .then((email) => {
      const buttonsHTML = !isSentMailbox
        ? `
        <div class="d-flex justify-content-between">
          <button class="btn btn-sm btn-primary" id="reply">Reply</button>
          <button class="btn btn-sm btn-warning" id="archive">
            ${email.archived ? "Unarchive" : "Archive"}
          </button>
        </div>
      `
        : "";

      document.querySelector("#email-container-view").innerHTML = `
        <div class="container border rounded p-3 mb-3">
          <h5 class="mb-3 text-primary">${email.subject}</h5>
          <span><strong>From:</strong> ${email.sender}</span>
          <span><strong>To:</strong> ${email.recipients.join(", ")}</span>
          <p><strong>Timestamp:</strong> ${email.timestamp}</p>
          <hr>
          <div class="email-body mb-3">
            <p>${email.body.replace(/\n/g, "<br>")}</p>
          </div>
          ${buttonsHTML}
        </div>
      `;

      if (!isSentMailbox) {
        document.querySelector("#archive").addEventListener("click", () => {
          fetch(`/emails/${id}`, {
            method: "PUT",
            body: JSON.stringify({ archived: !email.archived }),
          }).then(() => load_mailbox("inbox"));
        });

        document.querySelector("#reply").addEventListener("click", () => {
          document.querySelector("#emails-view").style.display = "none";
          document.querySelector("#compose-view").style.display = "block";
          document.querySelector("#email-container-view").style.display =
            "none";

          document.querySelector("#compose-recipients").value = email.sender;
          document.querySelector("#compose-subject").value =
            email.subject.startsWith("Re:")
              ? email.subject
              : `Re: ${email.subject}`;
          document.querySelector(
            "#compose-body"
          ).value = `On ${email.timestamp}, ${email.sender} wrote:\n${email.body}\n\n`;
        });
      }
    });
}

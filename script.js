const form = document.querySelector(".contact-form");
const note = document.querySelector(".form-note");

if (form && note) {
  form.addEventListener("submit", () => {
    note.textContent = "Sending enquiry...";
  });
}

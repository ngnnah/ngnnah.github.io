// The portrait shows a second photo on hover; a tap or a key press flips it.
document.querySelectorAll(".portrait").forEach(function (button) {
  button.addEventListener("click", function () {
    var on = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Show the photo of Nhat" : "Show Nhat's face as a glacier");
  });
});

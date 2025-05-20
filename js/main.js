document.addEventListener("DOMContentLoaded", function () {
  // Smooth scrolling for internal links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 80,
          behavior: "smooth",
        });
      }
    });
  });

  // Add current date to footer
  const currentYear = new Date().getFullYear();
  const copyright = document.querySelector("footer p");
  if (copyright) {
    copyright.textContent = `© ${currentYear} ngnnah`;
  }
});

// Detect scroll for header shadow
window.addEventListener("scroll", function () {
  const header = document.querySelector("header");
  if (window.scrollY > 10) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});


// Logo animation on page load
document.addEventListener("DOMContentLoaded", function() {
  const logo = document.querySelector(".header-logo");
  if (logo) {
    // Start slightly elevated
    logo.style.transform = "translateY(-10px) rotate(-8deg)";
    logo.style.opacity = "0.7";
    
    // Animate to normal position
    setTimeout(() => {
      logo.style.transition = "transform 0.5s ease, opacity 0.5s ease";
      logo.style.transform = "translateY(0) rotate(0)";
      logo.style.opacity = "1";
    }, 100);
  }
});
document.addEventListener('DOMContentLoaded', function() {
  // Smooth scrolling for nav links (single implementation)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      const yOffset = -80; // Adjust for fixed header
      
      window.scrollTo({
        top: targetElement.offsetTop + yOffset,
        behavior: 'smooth'
      });
    });
  });

  // Button functionality
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const getStarted = document.getElementById('getStarted');
  const createTogether = document.getElementById('createTogether');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      window.location.href = 'signup.html';
    });
  }

  if (getStarted) {
    getStarted.addEventListener('click', () => {
      window.location.href = 'signup.html';
    });
  }

  if (createTogether) {
    createTogether.addEventListener('click', () => {
      window.location.href = 'signup.html'; // or 'contact.html' if different
    });
  }
});
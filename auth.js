document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  const isFirebaseConfigured = () => {
    return window.firebase &&
      window.firebase.apps &&
      window.firebase.apps.length > 0 &&
      typeof window.firebase.auth === 'function';
  };

  const showMessage = (message, type = 'error') => {
    const box = document.getElementById('form-message');
    if (!box) return;

    box.textContent = message;
    box.classList.remove('hidden', 'success', 'error');
    box.classList.add(type === 'success' ? 'success' : 'error');
  };

  if (!isFirebaseConfigured()) {
    showMessage('Firebase is not configured yet. Update firebase-config.js with your project values.', 'error');
    return;
  }

  if (['login.html', 'signup.html', 'forgot-password.html'].includes(currentPage)) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        window.location.href = 'index.html';
      }
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        showMessage('Please enter both email and password.', 'error');
        return;
      }

      try {
        showMessage('Signing you in...', 'success');
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'dashboard.html';
      } catch (error) {
        showMessage(error.message || 'Unable to sign in. Please try again.', 'error');
      }
    });
  }

  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const firstName = document.getElementById('first-name').value.trim();
      const lastName = document.getElementById('last-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const idNumber = document.getElementById('id-number').value.trim();
      const password = document.getElementById('signup-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const termsAccepted = document.getElementById('terms').checked;

      if (!firstName || !lastName || !email || !idNumber || !password || !confirmPassword) {
        showMessage('Please complete all fields before creating your account.', 'error');
        return;
      }

      if (password !== confirmPassword) {
        showMessage('Passwords do not match.', 'error');
        return;
      }

      if (password.length < 6) {
        showMessage('Password must be at least 6 characters long.', 'error');
        return;
      }

      if (!termsAccepted) {
        showMessage('You must accept the terms and privacy policy to continue.', 'error');
        return;
      }

      try {
        showMessage('Creating your account...', 'success');

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        await db.collection('users').doc(uid).set({
          firstName,
          lastName,
          email,
          idNumber,
          createdAt: new Date().toISOString()
        }, { merge: true });

        window.location.href = 'dashboard.html';
      } catch (error) {
        showMessage(error.message || 'Unable to create your account right now.', 'error');
      }
    });
  }

  const forgotPasswordForm = document.getElementById('forgot-password-form');
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('forgot-email').value.trim();

      if (!email) {
        showMessage('Please enter your email address.', 'error');
        return;
      }

      try {
        showMessage('Sending reset link...', 'success');
        await auth.sendPasswordResetEmail(email);
        showMessage('Password reset email sent. Check your inbox and spam folder.', 'success');
        forgotPasswordForm.reset();
      } catch (error) {
        showMessage(error.message || 'We could not send a reset email.', 'error');
      }
    });
  }
});

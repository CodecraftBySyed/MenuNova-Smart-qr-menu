const API_URL = `${API_BASE_URL}/api`;

const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
const usernameEl = document.getElementById('email'); 
const username = usernameEl ? usernameEl.value.trim() : '';
const password = document.getElementById('password').value;
  
  errorMsg.classList.add('hidden');
  
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // Backend currently expects "email"; map username -> email without changing server
      body: JSON.stringify({ email: username, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.msg || 'Login failed');
    }
    
    localStorage.setItem('adminToken', data.token);
    
    if (window.Swal) {
      await window.Swal.fire({
        icon: 'success',
        title: 'Welcome back',
        text: 'Login successful',
        timer: 1200,
        showConfirmButton: false
      });
    }
    window.location.href = 'admin.html';
    
  } catch (err) {
    if (window.Swal) {
      window.Swal.fire({ icon: 'error', title: 'Login failed', text: err.message });
    } else {
      errorMsg.textContent = err.message;
      errorMsg.classList.remove('hidden');
    }
  }
});

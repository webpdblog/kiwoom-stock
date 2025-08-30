import './index.css';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const appkeyInput = document.getElementById('appkey') as HTMLInputElement;
  const secretkeyInput = document.getElementById('secretkey') as HTMLInputElement;
  const messageDiv = document.getElementById('message') as HTMLDivElement;
  const appContainer = document.getElementById('app-container') as HTMLDivElement;
  const menu = document.querySelector('#sidebar .menu');
  const mainContent = document.querySelector('#main-content .content');

  let accessToken = '';

  // Listen for environment variables from the main process
  window.electronAPI.on('env-vars', (envVars: { appkey: string; secretkey: string }) => {
    if (envVars.appkey) {
      appkeyInput.value = envVars.appkey;
    }
    if (envVars.secretkey) {
      secretkeyInput.value = envVars.secretkey;
    }
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const appkey = appkeyInput.value;
    const secretkey = secretkeyInput.value;

    messageDiv.textContent = 'Logging in...';
    messageDiv.style.color = 'blue';

    try {
      const result = await window.electronAPI.invoke('login', { appkey, secretkey });
      if (result.success) {
        messageDiv.textContent = 'Login successful!';
        messageDiv.style.color = 'green';
        accessToken = result.token;
        
        document.body.classList.add('logged-in');
        document.getElementById('login-container').style.display = 'none';
        appContainer.style.display = 'flex'; // Use flex to manage sidebar and content

        const menuItems = [
          { id: 'au10002', name: '접근토큰 폐기' }
        ];

        if (menu) {
          menu.innerHTML = ''; // Clear existing menu items
          menuItems.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" data-id="${item.id}">${item.name} (${item.id})</a>`;
            menu.appendChild(li);
          });
        }

      } else {
        messageDiv.textContent = `Login failed: ${result.message}`;
        messageDiv.style.color = 'red';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      messageDiv.textContent = `An error occurred: ${errorMessage}`;
      messageDiv.style.color = 'red';
    }
  });

  menu.addEventListener('click', async (event) => {
    event.preventDefault();
    const target = event.target as HTMLAnchorElement;
    const actionId = target.dataset.id;

    if (actionId === 'au10002') {
      if (!mainContent) return;
      mainContent.innerHTML = '<h1>Revoking Token...</h1>';
      try {
        const appkey = appkeyInput.value;
        const secretkey = secretkeyInput.value;
        const result = await window.electronAPI.invoke('revoke-token', {
          appkey,
          secretkey,
          token: accessToken,
        });

        if (result.success) {
          let countdown = 3;
          mainContent.innerHTML = `<h1>Token Revoked</h1><p>${result.message}</p><p>Redirecting to login in ${countdown} seconds...</p>`;
          accessToken = ''; // Clear the token

          const intervalId = setInterval(() => {
            countdown--;
            if (countdown > 0) {
              mainContent.innerHTML = `<h1>Token Revoked</h1><p>${result.message}</p><p>Redirecting to login in ${countdown} seconds...</p>`;
            } else {
              clearInterval(intervalId);
              const loginContainer = document.getElementById('login-container');
              if (loginContainer) {
                loginContainer.style.display = 'block';
              }
              appContainer.style.display = 'none';
              document.body.classList.remove('logged-in');
              mainContent.innerHTML = '';
              // also clear the login message
              messageDiv.textContent = '';
            }
          }, 1000);
        } else {
          mainContent.innerHTML = `<h1>Error</h1><p>${result.message}</p>`;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        mainContent.innerHTML = `<h1>Error</h1><p>${errorMessage}</p>`;
      }
    }
  });
});

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
          { id: 'au10002', name: '접근토큰 폐기' },
          { id: 'ka10099', name: '종목정보 리스트' },
          { id: 'ka10001', name: '주식기본정보요청' }
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
    if (!target.dataset.id) return;
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
    } else if (actionId === 'ka10099') {
      if (!mainContent) return;
      mainContent.innerHTML = '<h1>Fetching Stock List...</h1>';
      try {
        const result = await window.electronAPI.invoke('get-stock-list', {
          mrkt_tp: '0', // KOSPI for now
          token: accessToken,
        });

        if (result.success) {
          let tableHTML = '<table><thead><tr>';
          const headers = ['code', 'name', 'listCount', 'auditInfo', 'regDay', 'lastPrice', 'state', 'marketName', 'upName'];
          headers.forEach(h => tableHTML += `<th>${h}</th>`);
          tableHTML += '</tr></thead><tbody>';

          result.list.forEach((stock: any) => {
            tableHTML += '<tr>';
            headers.forEach(h => tableHTML += `<td>${stock[h]}</td>`);
            tableHTML += '</tr>';
          });

          tableHTML += '</tbody></table>';
          mainContent.innerHTML = `<h1>Stock List (KOSPI)</h1>${tableHTML}`;
        } else {
          mainContent.innerHTML = `<h1>Error</h1><p>${result.message}</p>`;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        mainContent.innerHTML = `<h1>Error</h1><p>${errorMessage}</p>`;
      }
    } else if (actionId === 'ka10001') {
      if (!mainContent) return;

      const keyMap = {
        stk_cd: '종목코드', stk_nm: '종목명', setl_mm: '결산월', fav: '액면가', cap: '자본금',
        flo_stk: '상장주식', crd_rt: '신용비율', oyr_hgst: '연중최고', oyr_lwst: '연중최저',
        mac: '시가총액', mac_wght: '시가총액비중', for_exh_rt: '외인소진률', repl_pric: '대용가',
        per: 'PER', eps: 'EPS', roe: 'ROE', pbr: 'PBR', ev: 'EV', bps: 'BPS',
        sale_amt: '매출액', bus_pro: '영업이익', cup_nga: '당기순이익', '250hgst': '250최고',
        '250lwst': '250최저', open_pric: '시가', high_pric: '고가', low_pric: '저가',
        upl_pric: '상한가', lst_pric: '하한가', base_pric: '기준가', exp_cntr_pric: '예상체결가',
        exp_cntr_qty: '예상체결수량', '250hgst_pric_dt': '250최고가일', '250hgst_pric_pre_rt': '250최고가대비율',
        '250lwst_pric_dt': '250최저가일', '250lwst_pric_pre_rt': '250최저가대비율', cur_prc: '현재가',
        pre_sig: '대비기호', pred_pre: '전일대비', flu_rt: '등락율', trde_qty: '거래량',
        trde_pre: '거래대비', fav_unit: '액면가단위', dstr_stk: '유통주식', dstr_rt: '유통비율'
      };

      mainContent.innerHTML = `
        <h1>주식기본정보요청 (ka10001)</h1>
        <div class="input-group autocomplete-container">
          <label for="stock-query">Stock Name or Code:</label>
          <input type="text" id="stock-query" name="stock-query" placeholder="종목명 또는 코드를 입력하세요..." autocomplete="off">
          <div id="autocomplete-suggestions" class="autocomplete-suggestions"></div>
        </div>
        <div id="stock-info-result"></div>
      `;

      const stockQueryInput = document.getElementById('stock-query') as HTMLInputElement;
      const suggestionsContainer = document.getElementById('autocomplete-suggestions') as HTMLDivElement;
      const stockInfoResult = document.getElementById('stock-info-result') as HTMLDivElement;

      const formatNumber = (value: string) => {
        const num = Number(value);
        if (!isNaN(num)) {
          return num.toLocaleString('en-US');
        }
        return value;
      };

      const fetchAndDisplayStockInfo = async (code: string) => {
        stockInfoResult.innerHTML = 'Fetching info...';
        try {
          const result = await window.electronAPI.invoke('get-stock-info', {
            query: code, // Pass the code directly
            token: accessToken,
          });

          if (result.success) {
            const info = result.info;
            const keys = Object.keys(info).filter(key => keyMap[key]);

            let tableHTML = '<table>';
            for (let i = 0; i < keys.length; i += 2) {
              const key1 = keys[i];
              const value1 = info[key1];
              const koreanKey1 = keyMap[key1];

              tableHTML += '<tr>';
              tableHTML += `<td><strong>${koreanKey1}</strong></td><td>${formatNumber(value1)}</td>`;

              if (i + 1 < keys.length) {
                const key2 = keys[i + 1];
                const value2 = info[key2];
                const koreanKey2 = keyMap[key2];
                tableHTML += `<td><strong>${koreanKey2}</strong></td><td>${formatNumber(value2)}</td>`;
              } else {
                tableHTML += '<td></td><td></td>'; // Empty cells for alignment
              }
              tableHTML += '</tr>';
            }
            tableHTML += '</table>';
            stockInfoResult.innerHTML = tableHTML;
          } else {
            stockInfoResult.innerHTML = `<p style="color: red;">Error: ${result.message}</p>`;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          stockInfoResult.innerHTML = `<p style="color: red;">Error: ${errorMessage}</p>`;
        }
      };

      stockQueryInput.addEventListener('input', async () => {
        const term = stockQueryInput.value;
        if (term.length < 1) {
          suggestionsContainer.innerHTML = '';
          suggestionsContainer.style.display = 'none';
          return;
        }

        const stocks = await window.electronAPI.invoke('search-stocks', { term });
        if (stocks.length > 0) {
          suggestionsContainer.innerHTML = stocks.map((s: {name: string, code: string}) => 
            `<div class="suggestion-item" data-code="${s.code}">${s.name} (${s.code})</div>`
          ).join('');
          suggestionsContainer.style.display = 'block';
        } else {
          suggestionsContainer.innerHTML = '';
          suggestionsContainer.style.display = 'none';
        }
      });

      suggestionsContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLDivElement;
        if (target.classList.contains('suggestion-item')) {
          const stockCode = target.dataset.code;
          stockQueryInput.value = ''; // Clear input
          suggestionsContainer.innerHTML = '';
          suggestionsContainer.style.display = 'none';
          fetchAndDisplayStockInfo(stockCode);
        }
      });
    }
  });
});

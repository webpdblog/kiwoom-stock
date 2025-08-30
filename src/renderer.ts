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
          { id: 'ka10001', name: '주식기본정보요청' },
          { id: 'ka10002', name: '주식거래원요청' },
          { id: 'ka10004', name: '주식호가요청' },
          { id: 'ka10005', name: '주식일주월시분요청' },
          { id: 'ka10006', name: '주식시분요청' },
          { id: 'ka10007', name: '시세표성정보요청' }
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
    } else if (actionId === 'ka10002') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>주식거래원요청 (ka10002)</h1>
        <div class="input-group autocomplete-container">
          <label for="stock-query-ka10002">Stock Name or Code:</label>
          <input type="text" id="stock-query-ka10002" name="stock-query" placeholder="종목명 또는 코드를 입력하세요..." autocomplete="off">
          <div id="autocomplete-suggestions-ka10002" class="autocomplete-suggestions"></div>
        </div>
        <div id="trading-members-result"></div>
      `;

      const stockQueryInput = document.getElementById('stock-query-ka10002') as HTMLInputElement;
      const suggestionsContainer = document.getElementById('autocomplete-suggestions-ka10002') as HTMLDivElement;
      const resultDiv = document.getElementById('trading-members-result') as HTMLDivElement;

      const fetchAndDisplayTradingMembers = async (code: string) => {
        resultDiv.innerHTML = 'Fetching trading members...';
        try {
          const result = await window.electronAPI.invoke('get-trading-members', {
            code: code,
            token: accessToken,
          });

          if (result.success) {
            const { sell, buy, total } = result.data;
            let tableHTML = '<h2>매도 상위</h2><table><thead><tr><th>순위</th><th>회원사명</th><th>매도량</th></tr></thead><tbody>';
            sell.forEach((item: any, index: number) => {
              tableHTML += `<tr><td>${index + 1}</td><td>${item.member}</td><td>${item.volume}</td></tr>`;
            });
            tableHTML += '</tbody></table>';

            tableHTML += '<h2>매수 상위</h2><table><thead><tr><th>순위</th><th>회원사명</th><th>매수량</th></tr></thead><tbody>';
            buy.forEach((item: any, index: number) => {
              tableHTML += `<tr><td>${index + 1}</td><td>${item.member}</td><td>${item.volume}</td></tr>`;
            });
            tableHTML += '</tbody></table>';
            
            resultDiv.innerHTML = tableHTML;
          } else {
            resultDiv.innerHTML = `<p style="color: red;">Error: ${result.message}</p>`;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          resultDiv.innerHTML = `<p style="color: red;">Error: ${errorMessage}</p>`;
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
          fetchAndDisplayTradingMembers(stockCode);
        }
      });
    } else if (actionId === 'ka10004') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>주식호가요청 (ka10004)</h1>
        <div class="input-group autocomplete-container">
          <label for="stock-query-ka10004">Stock Name or Code:</label>
          <input type="text" id="stock-query-ka10004" name="stock-query" placeholder="종목명 또는 코드를 입력하세요..." autocomplete="off">
          <div id="autocomplete-suggestions-ka10004" class="autocomplete-suggestions"></div>
        </div>
        <div id="stock-quote-result"></div>
      `;

      const stockQueryInput = document.getElementById('stock-query-ka10004') as HTMLInputElement;
      const suggestionsContainer = document.getElementById('autocomplete-suggestions-ka10004') as HTMLDivElement;
      const resultDiv = document.getElementById('stock-quote-result') as HTMLDivElement;

      const fetchAndDisplayStockQuotes = async (code: string) => {
        resultDiv.innerHTML = 'Fetching stock quotes...';
        try {
          const result = await window.electronAPI.invoke('get-stock-quotes', {
            code: code,
            token: accessToken,
          });

          if (result.success) {
            const quote = result.quote;
            const formatNumber = (value: string) => {
              const num = Number(value);
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value;
            };
            let tableHTML = '<table class="stock-quote-table"><thead><tr><th>매도잔량</th><th>매도호가</th><th></th><th>매수호가</th><th>매수잔량</th></tr></thead><tbody>';

            // Sell quotes (10th to 1st)
            for (let i = 10; i >= 1; i--) {
              const sellReq = formatNumber(quote[`sel_${i}th_pre_req`] || '0');
              const sellBid = formatNumber(quote[`sel_${i}th_pre_bid`] || '0');
              tableHTML += `<tr><td>${sellReq}</td><td>${sellBid}</td><td></td><td></td><td></td></tr>`;
            }

            // Best sell and buy quotes
            tableHTML += `<tr><td>${formatNumber(quote.sel_fpr_req || '0')}</td><td>${formatNumber(quote.sel_fpr_bid || '0')}</td><td>현재가</td><td>${formatNumber(quote.buy_fpr_bid || '0')}</td><td>${formatNumber(quote.buy_fpr_req || '0')}</td></tr>`;

            // Buy quotes (1st to 10th)
            for (let i = 1; i <= 10; i++) {
              const buyReq = formatNumber(quote[`buy_${i}th_pre_req`] || '0');
              const buyBid = formatNumber(quote[`buy_${i}th_pre_bid`] || '0');
              tableHTML += `<tr><td></td><td></td><td></td><td>${buyBid}</td><td>${buyReq}</td></tr>`;
            }

            tableHTML += `<tr><td colspan="2">총매도잔량: ${formatNumber(quote.tot_sel_req || '0')}</td><td></td><td colspan="2">총매수잔량: ${formatNumber(quote.tot_buy_req || '0')}</td></tr>`;
            tableHTML += `<tr><td colspan="2">시간외매도잔량: ${formatNumber(quote.ovt_sel_req || '0')}</td><td></td><td colspan="2">시간외매수잔량: ${formatNumber(quote.ovt_buy_req || '0')}</td></tr>`;

            tableHTML += '</tbody></table>';
            resultDiv.innerHTML = tableHTML;
          } else {
            resultDiv.innerHTML = `<p style="color: red;">Error: ${result.message}</p>`;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          resultDiv.innerHTML = `<p style="color: red;">Error: ${errorMessage}</p>`;
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
          fetchAndDisplayStockQuotes(stockCode);
        }
      });
    } else if (actionId === 'ka10005') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>주식일주월시분요청 (ka10005)</h1>
        <div class="input-group autocomplete-container">
          <label for="stock-query-ka10005">Stock Name or Code:</label>
          <input type="text" id="stock-query-ka10005" name="stock-query" placeholder="종목명 또는 코드를 입력하세요..." autocomplete="off">
          <div id="autocomplete-suggestions-ka10005" class="autocomplete-suggestions"></div>
        </div>
        <div id="stock-history-result"></div>
      `;

      const stockQueryInput = document.getElementById('stock-query-ka10005') as HTMLInputElement;
      const suggestionsContainer = document.getElementById('autocomplete-suggestions-ka10005') as HTMLDivElement;
      const resultDiv = document.getElementById('stock-history-result') as HTMLDivElement;

      const fetchAndDisplayStockHistory = async (code: string) => {
        resultDiv.innerHTML = 'Fetching stock history...';
        try {
          const result = await window.electronAPI.invoke('get-stock-history', {
            code: code,
            token: accessToken,
          });

          if (result.success) {
            const history = result.history;
            const formatNumber = (value: string) => {
              const num = Number(value);
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value;
            };

            const formatDate = (dateString: string) => {
              if (!dateString || dateString.length !== 8) return dateString;
              return `${dateString.substring(0, 4)}/${dateString.substring(4, 6)}/${dateString.substring(6, 8)}`;
            };

            let tableHTML = '<table class="stock-history-table"><thead><tr>';
            const headers = [
              '날짜', '시가', '고가', '저가', '종가', '대비', '등락률', '거래량', '거래대금',
              '외인보유', '외인비중', '외인순매수', '기관순매수', '개인순매수', '신용잔고율', '외국계', '프로그램'
            ];
            headers.forEach(h => tableHTML += `<th>${h}</th>`);
            tableHTML += '</tr></thead><tbody>';

            history.forEach((item: any) => {
              tableHTML += '<tr>';
              tableHTML += `<td>${formatDate(item.date)}</td>`;
              tableHTML += `<td>${formatNumber(item.open_pric)}</td>`;
              tableHTML += `<td>${formatNumber(item.high_pric)}</td>`;
              tableHTML += `<td>${formatNumber(item.low_pric)}</td>`;
              tableHTML += `<td>${formatNumber(item.close_pric)}</td>`;
              tableHTML += `<td>${formatNumber(item.pre)}</td>`;
              tableHTML += `<td>${item.flu_rt}</td>`; // flu_rt is a string with percentage
              tableHTML += `<td>${formatNumber(item.trde_qty)}</td>`;
              tableHTML += `<td>${formatNumber(item.trde_prica)}</td>`;
              tableHTML += `<td>${formatNumber(item.for_poss)}</td>`;
              tableHTML += `<td>${item.for_wght}</td>`; // for_wght is a string with percentage
              tableHTML += `<td>${formatNumber(item.for_netprps)}</td>`;
              tableHTML += `<td>${formatNumber(item.orgn_netprps)}</td>`;
              tableHTML += `<td>${formatNumber(item.ind_netprps)}</td>`;
              tableHTML += `<td>${item.crd_remn_rt}</td>`; // crd_remn_rt is a string with percentage
              tableHTML += `<td>${formatNumber(item.frgn)}</td>`;
              tableHTML += `<td>${formatNumber(item.prm)}</td>`;
              tableHTML += '</tr>';
            });

            tableHTML += '</tbody></table>';
            resultDiv.innerHTML = tableHTML;
          } else {
            resultDiv.innerHTML = `<p style="color: red;">Error: ${result.message}</p>`;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          resultDiv.innerHTML = `<p style="color: red;">Error: ${errorMessage}</p>`;
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
          fetchAndDisplayStockHistory(stockCode);
        }
      });
    } else if (actionId === 'ka10006') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>주식시분요청 (ka10006)</h1>
        <div class="input-group autocomplete-container">
          <label for="stock-query-ka10006">Stock Name or Code:</label>
          <input type="text" id="stock-query-ka10006" name="stock-query" placeholder="종목명 또는 코드를 입력하세요..." autocomplete="off">
          <div id="autocomplete-suggestions-ka10006" class="autocomplete-suggestions"></div>
        </div>
        <div id="stock-minute-result"></div>
      `;

      const stockQueryInput = document.getElementById('stock-query-ka10006') as HTMLInputElement;
      const suggestionsContainer = document.getElementById('autocomplete-suggestions-ka10006') as HTMLDivElement;
      const resultDiv = document.getElementById('stock-minute-result') as HTMLDivElement;

      const fetchAndDisplayStockMinuteData = async (code: string) => {
        resultDiv.innerHTML = 'Fetching stock minute data...';
        try {
          const result = await window.electronAPI.invoke('get-stock-minute-data', {
            code: code,
            token: accessToken,
          });

          if (result.success) {
            const minuteData = result.minuteData;
            const formatNumber = (value: string) => {
              const num = Number(value);
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value;
            };

            const formatDate = (dateString: string) => {
              if (!dateString || dateString.length !== 8) return dateString;
              return `${dateString.substring(0, 4)}/${dateString.substring(4, 6)}/${dateString.substring(6, 8)}`;
            };

            let tableHTML = '<table class="stock-minute-table"><tbody>';
            const fields = {
              date: '날짜',
              open_pric: '시가',
              high_pric: '고가',
              low_pric: '저가',
              close_pric: '종가',
              pre: '대비',
              flu_rt: '등락률',
              trde_qty: '거래량',
              trde_prica: '거래대금',
              cntr_str: '체결강도',
            };

            for (const key in fields) {
              if (fields.hasOwnProperty(key)) {
                const value = minuteData[key];
                let formattedValue = value;
                if (key === 'date') {
                  formattedValue = formatDate(value);
                } else if (key === 'flu_rt' || key === 'cntr_str') {
                  // These are already strings with percentage or decimal
                } else {
                  formattedValue = formatNumber(value);
                }
                tableHTML += `<tr><td><strong>${fields[key]}</strong></td><td>${formattedValue}</td></tr>`;
              }
            }

            tableHTML += '</tbody></table>';
            resultDiv.innerHTML = tableHTML;
          } else {
            resultDiv.innerHTML = `<p style="color: red;">Error: ${result.message}</p>`;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          resultDiv.innerHTML = `<p style="color: red;">Error: ${errorMessage}</p>`;
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
          fetchAndDisplayStockMinuteData(stockCode);
        }
      });
    } else if (actionId === 'ka10007') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>시세표성정보요청 (ka10007)</h1>
        <div class="input-group autocomplete-container">
          <label for="stock-query-ka10007">Stock Name or Code:</label>
          <input type="text" id="stock-query-ka10007" name="stock-query" placeholder="종목명 또는 코드를 입력하세요..." autocomplete="off">
          <div id="autocomplete-suggestions-ka10007" class="autocomplete-suggestions"></div>
        </div>
        <div id="market-price-info-result"></div>
      `;

      const stockQueryInput = document.getElementById('stock-query-ka10007') as HTMLInputElement;
      const suggestionsContainer = document.getElementById('autocomplete-suggestions-ka10007') as HTMLDivElement;
      const resultDiv = document.getElementById('market-price-info-result') as HTMLDivElement;

      const fetchAndDisplayMarketPriceInfo = async (code: string) => {
        resultDiv.innerHTML = 'Fetching market price information...';
        try {
          const result = await window.electronAPI.invoke('get-market-price-info', {
            code: code,
            token: accessToken,
          });

          if (result.success) {
            const info = result.info;
            const formatNumber = (value: string) => {
              const num = Number(value);
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value;
            };

            const formatDate = (dateString: string) => {
              if (!dateString || dateString.length !== 8) return dateString;
              return `${dateString.substring(0, 4)}/${dateString.substring(4, 6)}/${dateString.substring(6, 8)}`;
            };

            let htmlContent = '<table class="market-info-table"><tbody>';

            const mainFields = {
              stk_nm: '종목명',
              stk_cd: '종목코드',
              date: '날짜',
              tm: '시간',
              pred_close_pric: '전일종가',
              pred_trde_qty: '전일거래량',
              upl_pric: '상한가',
              lst_pric: '하한가',
              pred_trde_prica: '전일거래대금',
              flo_stkcnt: '상장주식수',
              cur_prc: '현재가',
              smbol: '부호',
              flu_rt: '등락률',
              pred_rt: '전일비',
              open_pric: '시가',
              high_pric: '고가',
              low_pric: '저가',
              cntr_qty: '체결량',
              trde_qty: '거래량',
              trde_prica: '거래대금',
              exp_cntr_pric: '예상체결가',
              exp_cntr_qty: '예상체결량',
              exp_sel_pri_bid: '예상매도우선호가',
              exp_buy_pri_bid: '예상매수우선호가',
              trde_strt_dt: '거래시작일',
              exec_pric: '행사가격',
              hgst_pric: '최고가',
              lwst_pric: '최저가',
              hgst_pric_dt: '최고가일',
              lwst_pric_dt: '최저가일',
            };

            const keys = Object.keys(mainFields);
            for (let i = 0; i < keys.length; i += 2) {
              const key1 = keys[i];
              const key2 = keys[i + 1];

              const value1 = info[key1];
              const value2 = info[key2];

              let formattedValue1 = value1;
              if (key1.endsWith('_dt') || key1 === 'date') {
                formattedValue1 = formatDate(value1);
              } else if (key1 === 'flu_rt' || key1 === 'pred_rt' || key1 === 'smbol') {
                // These are already strings with percentage or symbols
              } else {
                formattedValue1 = formatNumber(value1);
              }

              let formattedValue2 = value2;
              if (key2 && (key2.endsWith('_dt') || key2 === 'date')) {
                formattedValue2 = formatDate(value2);
              } else if (key2 && (key2 === 'flu_rt' || key2 === 'pred_rt' || key2 === 'smbol')) {
                // These are already strings with percentage or symbols
              } else if (key2) {
                formattedValue2 = formatNumber(value2);
              }

              htmlContent += '<tr>';
              htmlContent += `<td><strong>${mainFields[key1]}</strong></td><td>${formattedValue1}</td>`;
              if (key2) {
                htmlContent += `<td><strong>${mainFields[key2]}</strong></td><td>${formattedValue2}</td>`;
              } else {
                htmlContent += '<td></td><td></td>'; // Empty cells for alignment
              }
              htmlContent += '</tr>';
            }
            htmlContent += '</tbody></table><hr>';

            // Bid/Ask prices and quantities
            htmlContent += '<h2>호가 정보</h2>';
            htmlContent += '<table class="bid-ask-table"><thead><tr><th>매도호가잔량</th><th>매도호가</th><th></th><th>매수호가</th><th>매수호가잔량</th></tr></thead><tbody>';

            for (let i = 10; i >= 1; i--) {
              const selBidReq = formatNumber(info[`sel_${i}bid_req`] || '0');
              const selBid = formatNumber(info[`sel_${i}bid`] || '0');
              const buyBid = formatNumber(info[`buy_${i}bid`] || '0');
              const buyBidReq = formatNumber(info[`buy_${i}bid_req`] || '0');
              htmlContent += `<tr><td>${selBidReq}</td><td>${selBid}</td><td></td><td>${buyBid}</td><td>${buyBidReq}</td></tr>`;
            }

            htmlContent += '</tbody></table><hr>';

            // Total bid/ask quantities and counts
            htmlContent += '<div class="total-bid-ask">';
            htmlContent += `<div><strong>총매도잔량</strong>: ${formatNumber(info.tot_sel_req || '0')}</div>`;
            htmlContent += `<div><strong>총매수잔량</strong>: ${formatNumber(info.tot_buy_req || '0')}</div>`;
            htmlContent += `<div><strong>총매도건수</strong>: ${formatNumber(info.tot_sel_cnt || '0')}</div>`;
            htmlContent += `<div><strong>총매수건수</strong>: ${formatNumber(info.tot_buy_cnt || '0')}</div>`;
            htmlContent += '</div>';

            resultDiv.innerHTML = htmlContent;
          } else {
            resultDiv.innerHTML = `<p style="color: red;">Error: ${result.message}</p>`;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          resultDiv.innerHTML = `<p style="color: red;">Error: ${errorMessage}</p>`;
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
          fetchAndDisplayMarketPriceInfo(stockCode);
        }
      });
    }
  });
});

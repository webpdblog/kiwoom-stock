import './index.css';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const appkeyInput = document.getElementById('appkey') as HTMLInputElement;
  const secretkeyInput = document.getElementById('secretkey') as HTMLInputElement;
  const messageDiv = document.getElementById('message') as HTMLDivElement;
  const appContainer = document.getElementById('app-container') as HTMLDivElement;
  const apiSelector = document.getElementById('api-selector') as HTMLSelectElement;
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
          { id: 'ka10007', name: '시세표성정보요청' },
          { id: 'ka10008', name: '주식외국인종목별매매동향' },
          { id: 'ka10009', name: '주식기관요청' },
          { id: 'ka10010', name: '업종프로그램요청' },
          { id: 'ka10011', name: '신주인수권전체시세요청' },
          { id: 'ka10013', name: '신용매매동향요청' },
          { id: 'ka10014', name: '공매도추이요청' },
          { id: 'ka10015', name: '일별거래상세요청' },
          { id: 'ka10016', name: '신고저가요청' },
          { id: 'ka10017', name: '상하한가요청' },
          { id: 'ka10018', name: '고저가근접요청' },
          { id: 'ka10019', name: '가격급등락요청' }
        ];

        if (apiSelector) {
          apiSelector.innerHTML = '<option value="">-- API를 선택하세요 --</option>'; // Clear existing options
          menuItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (${item.id})`;
            apiSelector.appendChild(option);
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

  apiSelector.addEventListener('change', async (event) => {
    const target = event.target as HTMLSelectElement;
    const actionId = target.value;
    if (!actionId) return;

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
    } else if (actionId === 'ka10008') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>주식외국인종목별매매동향 (ka10008)</h1>
        <div class="input-group autocomplete-container">
          <label for="stock-query-ka10008">Stock Name or Code:</label>
          <input type="text" id="stock-query-ka10008" name="stock-query" placeholder="종목명 또는 코드를 입력하세요..." autocomplete="off">
          <div id="autocomplete-suggestions-ka10008" class="autocomplete-suggestions"></div>
        </div>
        <div id="foreign-trading-trend-result"></div>
      `;

      const stockQueryInput = document.getElementById('stock-query-ka10008') as HTMLInputElement;
      const suggestionsContainer = document.getElementById('autocomplete-suggestions-ka10008') as HTMLDivElement;
      const resultDiv = document.getElementById('foreign-trading-trend-result') as HTMLDivElement;

      const fetchAndDisplayForeignTradingTrend = async (code: string) => {
        resultDiv.innerHTML = 'Fetching foreign trading trend...';
        try {
          const result = await window.electronAPI.invoke('get-foreign-trading-trend', {
            code: code,
            token: accessToken,
          });

          if (result.success) {
            const trendData = result.trendData;
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

            let tableHTML = '<table class="foreign-trading-trend-table"><thead><tr>';
            const headers = [
              '일자', '종가', '전일대비', '거래량', '변동수량', '보유주식수', '비중',
              '취득가능주식수', '외국인한도', '외국인한도증감', '한도소진률'
            ];
            headers.forEach(h => tableHTML += `<th>${h}</th>`);
            tableHTML += '</tr></thead><tbody>';

            trendData.forEach((item: any) => {
              tableHTML += '<tr>';
              tableHTML += `<td>${formatDate(item.dt)}</td>`;
              tableHTML += `<td>${formatNumber(item.close_pric)}</td>`;
              tableHTML += `<td>${formatNumber(item.pred_pre)}</td>`;
              tableHTML += `<td>${formatNumber(item.trde_qty)}</td>`;
              tableHTML += `<td>${formatNumber(item.chg_qty)}</td>`;
              tableHTML += `<td>${formatNumber(item.poss_stkcnt)}</td>`;
              tableHTML += `<td>${item.wght}</td>`; // wght is a string with percentage
              tableHTML += `<td>${formatNumber(item.gain_pos_stkcnt)}</td>`;
              tableHTML += `<td>${formatNumber(item.frgnr_limit)}</td>`;
              tableHTML += `<td>${formatNumber(item.frgnr_limit_irds)}</td>`;
              tableHTML += `<td>${item.limit_exh_rt}</td>`; // limit_exh_rt is a string with percentage
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
          fetchAndDisplayForeignTradingTrend(stockCode);
        }
      });
    } else if (actionId === 'ka10009') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>주식기관요청 (ka10009)</h1>
        <div class="input-group autocomplete-container">
          <label for="stock-query-ka10009">Stock Name or Code:</label>
          <input type="text" id="stock-query-ka10009" name="stock-query" placeholder="종목명 또는 코드를 입력하세요..." autocomplete="off">
          <div id="autocomplete-suggestions-ka10009" class="autocomplete-suggestions"></div>
        </div>
        <div id="institution-trading-result"></div>
      `;

      const stockQueryInput = document.getElementById('stock-query-ka10009') as HTMLInputElement;
      const suggestionsContainer = document.getElementById('autocomplete-suggestions-ka10009') as HTMLDivElement;
      const resultDiv = document.getElementById('institution-trading-result') as HTMLDivElement;

      const fetchAndDisplayInstitutionTradingData = async (code: string) => {
        resultDiv.innerHTML = 'Fetching institution trading data...';
        try {
          const result = await window.electronAPI.invoke('get-institution-trading-data', {
            code: code,
            token: accessToken,
          });

          if (result.success) {
            const institutionData = result.institutionData;
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

            let tableHTML = '<table class="institution-trading-table"><tbody>';
            const fields = {
              date: '날짜',
              close_pric: '종가',
              pre: '대비',
              orgn_dt_acc: '기관기간누적',
              orgn_daly_nettrde: '기관일별순매매',
              frgnr_daly_nettrde: '외국인일별순매매',
              frgnr_qota_rt: '외국인지분율',
            };

            for (const key in fields) {
              if (fields.hasOwnProperty(key)) {
                const value = institutionData[key];
                let formattedValue = value;
                if (key === 'date') {
                  formattedValue = formatDate(value);
                } else if (key === 'frgnr_qota_rt') {
                  // This is already a string with percentage
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
          fetchAndDisplayInstitutionTradingData(stockCode);
        }
      });
    } else if (actionId === 'ka10010') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>업종프로그램요청 (ka10010)</h1>
        <div class="input-group autocomplete-container">
          <label for="stock-query-ka10010">Stock Name or Code:</label>
          <input type="text" id="stock-query-ka10010" name="stock-query" placeholder="종목명 또는 코드를 입력하세요..." autocomplete="off">
          <div id="autocomplete-suggestions-ka10010" class="autocomplete-suggestions"></div>
        </div>
        <div id="sector-program-result"></div>
      `;

      const stockQueryInput = document.getElementById('stock-query-ka10010') as HTMLInputElement;
      const suggestionsContainer = document.getElementById('autocomplete-suggestions-ka10010') as HTMLDivElement;
      const resultDiv = document.getElementById('sector-program-result') as HTMLDivElement;

      const fetchAndDisplaySectorProgramData = async (code: string) => {
        resultDiv.innerHTML = 'Fetching sector program data...';
        try {
          const result = await window.electronAPI.invoke('get-sector-program-data', {
            code: code,
            token: accessToken,
          });

          if (result.success) {
            const programData = result.programData;
            const formatNumber = (value: string) => {
              const num = Number(value);
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value || '0';
            };

            let tableHTML = '<table class="sector-program-table"><tbody>';
            const fields = {
              dfrt_trst_sell_qty: '차익위탁매도수량',
              dfrt_trst_sell_amt: '차익위탁매도금액', 
              dfrt_trst_buy_qty: '차익위탁매수수량',
              dfrt_trst_buy_amt: '차익위탁매수금액',
              dfrt_trst_netprps_qty: '차익위탁순매수수량',
              dfrt_trst_netprps_amt: '차익위탁순매수금액',
              ndiffpro_trst_sell_qty: '비차익위탁매도수량',
              ndiffpro_trst_sell_amt: '비차익위탁매도금액',
              ndiffpro_trst_buy_qty: '비차익위탁매수수량',
              ndiffpro_trst_buy_amt: '비차익위탁매수금액',
              ndiffpro_trst_netprps_qty: '비차익위탁순매수수량',
              ndiffpro_trst_netprps_amt: '비차익위탁순매수금액',
              all_dfrt_trst_sell_qty: '전체차익위탁매도수량',
              all_dfrt_trst_sell_amt: '전체차익위탁매도금액',
              all_dfrt_trst_buy_qty: '전체차익위탁매수수량',
              all_dfrt_trst_buy_amt: '전체차익위탁매수금액',
              all_dfrt_trst_netprps_qty: '전체차익위탁순매수수량',
              all_dfrt_trst_netprps_amt: '전체차익위탁순매수금액',
            };

            for (const key in fields) {
              if (fields.hasOwnProperty(key)) {
                const value = programData[key];
                const formattedValue = formatNumber(value);
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
          fetchAndDisplaySectorProgramData(stockCode);
        }
      });
    } else if (actionId === 'ka10011') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>신주인수권전체시세요청 (ka10011)</h1>
        <div class="input-group">
          <label for="rights-type-select">신주인수권구분:</label>
          <select id="rights-type-select" name="rights-type">
            <option value="00">전체</option>
            <option value="05">신주인수권증권</option>
            <option value="07">신주인수권증서</option>
          </select>
          <button id="rights-submit-btn">조회</button>
        </div>
        <div id="rights-offering-result"></div>
      `;

      const rightsTypeSelect = document.getElementById('rights-type-select') as HTMLSelectElement;
      const submitBtn = document.getElementById('rights-submit-btn') as HTMLButtonElement;
      const resultDiv = document.getElementById('rights-offering-result') as HTMLDivElement;

      const fetchAndDisplayRightsOfferingData = async () => {
        const selectedType = rightsTypeSelect.value;
        resultDiv.innerHTML = 'Fetching rights offering data...';
        
        try {
          const result = await window.electronAPI.invoke('get-rights-offering-data', {
            type: selectedType,
            token: accessToken,
          });

          if (result.success) {
            const rightsData = result.rightsData;
            
            if (!rightsData || rightsData.length === 0) {
              resultDiv.innerHTML = '<p>조회된 데이터가 없습니다.</p>';
              return;
            }

            const formatNumber = (value: string) => {
              if (!value || value === '-0' || value === '0') return '0';
              const num = Number(value);
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value;
            };

            const getSignSymbol = (sign: string) => {
              switch (sign) {
                case '1': return '▲';
                case '2': return '▲';
                case '4': return '▼';
                case '5': return '▼';
                case '3':
                default: return '-';
              }
            };

            let tableHTML = '<table class="rights-offering-table"><thead><tr>';
            const headers = [
              '종목코드', '종목명', '현재가', '대비기호', '전일대비', '등락율',
              '최우선매도호가', '최우선매수호가', '누적거래량', '시가', '고가', '저가'
            ];
            headers.forEach(h => tableHTML += `<th>${h}</th>`);
            tableHTML += '</tr></thead><tbody>';

            rightsData.forEach((item: any) => {
              const signSymbol = getSignSymbol(item.pred_pre_sig);
              tableHTML += '<tr>';
              tableHTML += `<td>${item.stk_cd}</td>`;
              tableHTML += `<td>${item.stk_nm}</td>`;
              tableHTML += `<td>${formatNumber(item.cur_prc)}</td>`;
              tableHTML += `<td>${signSymbol}</td>`;
              tableHTML += `<td>${formatNumber(item.pred_pre)}</td>`;
              tableHTML += `<td>${item.flu_rt}%</td>`;
              tableHTML += `<td>${formatNumber(item.fpr_sel_bid)}</td>`;
              tableHTML += `<td>${formatNumber(item.fpr_buy_bid)}</td>`;
              tableHTML += `<td>${formatNumber(item.acc_trde_qty)}</td>`;
              tableHTML += `<td>${formatNumber(item.open_pric)}</td>`;
              tableHTML += `<td>${formatNumber(item.high_pric)}</td>`;
              tableHTML += `<td>${formatNumber(item.low_pric)}</td>`;
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

      submitBtn.addEventListener('click', fetchAndDisplayRightsOfferingData);
      
      // Auto-load data on page load with default selection
      fetchAndDisplayRightsOfferingData();
    } else if (actionId === 'ka10013') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>신용매매동향요청 (ka10013)</h1>
        <div class="input-group autocomplete-container">
          <label for="stock-query-ka10013">Stock Name or Code:</label>
          <input type="text" id="stock-query-ka10013" name="stock-query" placeholder="종목명 또는 코드를 입력하세요..." autocomplete="off">
          <div id="autocomplete-suggestions-ka10013" class="autocomplete-suggestions"></div>
        </div>
        <div class="input-group">
          <label for="date-input-ka10013">일자:</label>
          <input type="date" id="date-input-ka10013" name="date" value="${new Date().toISOString().split('T')[0]}">
          <label for="query-type-select-ka10013">조회구분:</label>
          <select id="query-type-select-ka10013" name="query-type">
            <option value="1">융자</option>
            <option value="2">대주</option>
          </select>
          <button id="credit-submit-btn">조회</button>
        </div>
        <div id="credit-trading-result"></div>
      `;

      const stockQueryInput = document.getElementById('stock-query-ka10013') as HTMLInputElement;
      const suggestionsContainer = document.getElementById('autocomplete-suggestions-ka10013') as HTMLDivElement;
      const dateInput = document.getElementById('date-input-ka10013') as HTMLInputElement;
      const queryTypeSelect = document.getElementById('query-type-select-ka10013') as HTMLSelectElement;
      const submitBtn = document.getElementById('credit-submit-btn') as HTMLButtonElement;
      const resultDiv = document.getElementById('credit-trading-result') as HTMLDivElement;

      let selectedStockCode = '';

      const fetchAndDisplayCreditTradingTrend = async () => {
        if (!selectedStockCode) {
          resultDiv.innerHTML = '<p style="color: red;">종목을 먼저 선택해주세요.</p>';
          return;
        }

        const selectedDate = dateInput.value.replace(/-/g, ''); // YYYYMMDD format
        const selectedQueryType = queryTypeSelect.value;
        
        resultDiv.innerHTML = 'Fetching credit trading trend...';
        
        try {
          const result = await window.electronAPI.invoke('get-credit-trading-trend', {
            code: selectedStockCode,
            date: selectedDate,
            queryType: selectedQueryType,
            token: accessToken,
          });

          if (result.success) {
            const trendData = result.trendData;
            
            if (!trendData || trendData.length === 0) {
              resultDiv.innerHTML = '<p>조회된 데이터가 없습니다.</p>';
              return;
            }

            const formatNumber = (value: string) => {
              if (!value || value === '' || value === '0') return '0';
              const num = Number(value.replace(/[+\-]/g, ''));
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value;
            };

            const formatDate = (dateString: string) => {
              if (!dateString || dateString.length !== 8) return dateString;
              return `${dateString.substring(0, 4)}/${dateString.substring(4, 6)}/${dateString.substring(6, 8)}`;
            };

            const getSignSymbol = (sign: string) => {
              switch (sign) {
                case '1': return '▲';
                case '2': return '▲';
                case '4': return '▼';
                case '5': return '▼';
                case '0':
                default: return '-';
              }
            };

            const queryTypeText = selectedQueryType === '1' ? '융자' : '대주';
            let tableHTML = `<h3>${queryTypeText} 신용매매동향</h3>`;
            tableHTML += '<table class="credit-trading-table"><thead><tr>';
            const headers = [
              '일자', '현재가', '대비기호', '전일대비', '거래량', '신규', '상환', '잔고', '금액', '대비', '공여율', '잔고율'
            ];
            headers.forEach(h => tableHTML += `<th>${h}</th>`);
            tableHTML += '</tr></thead><tbody>';

            trendData.forEach((item: any) => {
              const signSymbol = getSignSymbol(item.pred_pre_sig);
              tableHTML += '<tr>';
              tableHTML += `<td>${formatDate(item.dt)}</td>`;
              tableHTML += `<td>${formatNumber(item.cur_prc)}</td>`;
              tableHTML += `<td>${signSymbol}</td>`;
              tableHTML += `<td>${formatNumber(item.pred_pre)}</td>`;
              tableHTML += `<td>${formatNumber(item.trde_qty)}</td>`;
              tableHTML += `<td>${formatNumber(item.new)}</td>`;
              tableHTML += `<td>${formatNumber(item.rpya)}</td>`;
              tableHTML += `<td>${formatNumber(item.remn)}</td>`;
              tableHTML += `<td>${formatNumber(item.amt)}</td>`;
              tableHTML += `<td>${formatNumber(item.pre)}</td>`;
              tableHTML += `<td>${item.shr_rt || '-'}</td>`;
              tableHTML += `<td>${item.remn_rt || '-'}</td>`;
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
          selectedStockCode = target.dataset.code;
          stockQueryInput.value = target.textContent; // Show selected stock
          suggestionsContainer.innerHTML = '';
          suggestionsContainer.style.display = 'none';
        }
      });

      submitBtn.addEventListener('click', fetchAndDisplayCreditTradingTrend);
    } else if (actionId === 'ka10014') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>공매도추이요청 (ka10014)</h1>
        <div class="input-group autocomplete-container">
          <label for="stock-query-ka10014">Stock Name or Code:</label>
          <input type="text" id="stock-query-ka10014" name="stock-query" placeholder="종목명 또는 코드를 입력하세요..." autocomplete="off">
          <div id="autocomplete-suggestions-ka10014" class="autocomplete-suggestions"></div>
        </div>
        <div class="input-group">
          <label for="time-type-select-ka10014">시간구분:</label>
          <select id="time-type-select-ka10014" name="time-type">
            <option value="0">시작일</option>
            <option value="1">기간</option>
          </select>
          <label for="start-date-input-ka10014">시작일자:</label>
          <input type="date" id="start-date-input-ka10014" name="start-date" value="${new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]}">
          <label for="end-date-input-ka10014">종료일자:</label>
          <input type="date" id="end-date-input-ka10014" name="end-date" value="${new Date().toISOString().split('T')[0]}">
          <button id="short-selling-submit-btn">조회</button>
        </div>
        <div id="short-selling-result"></div>
      `;

      const stockQueryInput = document.getElementById('stock-query-ka10014') as HTMLInputElement;
      const suggestionsContainer = document.getElementById('autocomplete-suggestions-ka10014') as HTMLDivElement;
      const timeTypeSelect = document.getElementById('time-type-select-ka10014') as HTMLSelectElement;
      const startDateInput = document.getElementById('start-date-input-ka10014') as HTMLInputElement;
      const endDateInput = document.getElementById('end-date-input-ka10014') as HTMLInputElement;
      const submitBtn = document.getElementById('short-selling-submit-btn') as HTMLButtonElement;
      const resultDiv = document.getElementById('short-selling-result') as HTMLDivElement;

      let selectedStockCode = '';

      const fetchAndDisplayShortSellingTrend = async () => {
        if (!selectedStockCode) {
          resultDiv.innerHTML = '<p style="color: red;">종목을 먼저 선택해주세요.</p>';
          return;
        }

        const selectedTimeType = timeTypeSelect.value;
        const selectedStartDate = startDateInput.value.replace(/-/g, ''); // YYYYMMDD format
        const selectedEndDate = endDateInput.value.replace(/-/g, ''); // YYYYMMDD format
        
        resultDiv.innerHTML = 'Fetching short selling trend...';
        
        try {
          const result = await window.electronAPI.invoke('get-short-selling-trend', {
            code: selectedStockCode,
            timeType: selectedTimeType,
            startDate: selectedStartDate,
            endDate: selectedEndDate,
            token: accessToken,
          });

          if (result.success) {
            const shortSellingData = result.shortSellingData;
            
            if (!shortSellingData || shortSellingData.length === 0) {
              resultDiv.innerHTML = '<p>조회된 데이터가 없습니다.</p>';
              return;
            }

            const formatNumber = (value: string) => {
              if (!value || value === '' || value === '0') return '0';
              const cleanValue = value.replace(/[+\-]/g, '');
              const num = Number(cleanValue);
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value;
            };

            const formatDate = (dateString: string) => {
              if (!dateString || dateString.length !== 8) return dateString;
              return `${dateString.substring(0, 4)}/${dateString.substring(4, 6)}/${dateString.substring(6, 8)}`;
            };

            const getSignSymbol = (sign: string) => {
              switch (sign) {
                case '1': return '▲';
                case '2': return '▲';
                case '4': return '▼';
                case '5': return '▼';
                case '0':
                default: return '-';
              }
            };

            const timeTypeText = selectedTimeType === '0' ? '시작일' : '기간';
            let tableHTML = `<h3>공매도추이 (${timeTypeText})</h3>`;
            tableHTML += '<table class="short-selling-table"><thead><tr>';
            const headers = [
              '일자', '종가', '대비기호', '전일대비', '등락율', '거래량', '공매도량', '누적공매도량', 
              '매매비중', '공매도거래대금', '공매도평균가'
            ];
            headers.forEach(h => tableHTML += `<th>${h}</th>`);
            tableHTML += '</tr></thead><tbody>';

            shortSellingData.forEach((item: any) => {
              const signSymbol = getSignSymbol(item.pred_pre_sig);
              tableHTML += '<tr>';
              tableHTML += `<td>${formatDate(item.dt)}</td>`;
              tableHTML += `<td>${formatNumber(item.close_pric)}</td>`;
              tableHTML += `<td>${signSymbol}</td>`;
              tableHTML += `<td>${formatNumber(item.pred_pre)}</td>`;
              tableHTML += `<td>${item.flu_rt}%</td>`;
              tableHTML += `<td>${formatNumber(item.trde_qty)}</td>`;
              tableHTML += `<td>${formatNumber(item.shrts_qty)}</td>`;
              tableHTML += `<td>${formatNumber(item.ovr_shrts_qty)}</td>`;
              tableHTML += `<td>${item.trde_wght || '-'}</td>`;
              tableHTML += `<td>${formatNumber(item.shrts_trde_prica)}</td>`;
              tableHTML += `<td>${formatNumber(item.shrts_avg_pric)}</td>`;
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
          selectedStockCode = target.dataset.code;
          stockQueryInput.value = target.textContent; // Show selected stock
          suggestionsContainer.innerHTML = '';
          suggestionsContainer.style.display = 'none';
        }
      });

      submitBtn.addEventListener('click', fetchAndDisplayShortSellingTrend);
    } else if (actionId === 'ka10015') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>일별거래상세요청 (ka10015)</h1>
        <div class="input-group autocomplete-container">
          <label for="stock-query-ka10015">Stock Name or Code:</label>
          <input type="text" id="stock-query-ka10015" name="stock-query" placeholder="종목명 또는 코드를 입력하세요..." autocomplete="off">
          <div id="autocomplete-suggestions-ka10015" class="autocomplete-suggestions"></div>
        </div>
        <div class="input-group">
          <label for="start-date-input-ka10015">시작일자:</label>
          <input type="date" id="start-date-input-ka10015" name="start-date" value="${new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]}">
          <button id="daily-trading-submit-btn">조회</button>
        </div>
        <div id="daily-trading-result"></div>
      `;

      const stockQueryInput = document.getElementById('stock-query-ka10015') as HTMLInputElement;
      const suggestionsContainer = document.getElementById('autocomplete-suggestions-ka10015') as HTMLDivElement;
      const startDateInput = document.getElementById('start-date-input-ka10015') as HTMLInputElement;
      const submitBtn = document.getElementById('daily-trading-submit-btn') as HTMLButtonElement;
      const resultDiv = document.getElementById('daily-trading-result') as HTMLDivElement;

      let selectedStockCode = '';

      const fetchAndDisplayDailyTradingDetails = async () => {
        if (!selectedStockCode) {
          resultDiv.innerHTML = '<p style="color: red;">종목을 먼저 선택해주세요.</p>';
          return;
        }

        const selectedStartDate = startDateInput.value.replace(/-/g, ''); // YYYYMMDD format
        
        resultDiv.innerHTML = 'Fetching daily trading details...';
        
        try {
          const result = await window.electronAPI.invoke('get-daily-trading-details', {
            code: selectedStockCode,
            startDate: selectedStartDate,
            token: accessToken,
          });

          if (result.success) {
            const dailyTradingData = result.dailyTradingData;
            
            if (!dailyTradingData || dailyTradingData.length === 0) {
              resultDiv.innerHTML = '<p>조회된 데이터가 없습니다.</p>';
              return;
            }

            const formatNumber = (value: string) => {
              if (!value || value === '' || value === '0') return '0';
              const cleanValue = value.replace(/[+\-]/g, '');
              const num = Number(cleanValue);
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value;
            };

            const formatDate = (dateString: string) => {
              if (!dateString || dateString.length !== 8) return dateString;
              return `${dateString.substring(0, 4)}/${dateString.substring(4, 6)}/${dateString.substring(6, 8)}`;
            };

            const getSignSymbol = (sign: string) => {
              switch (sign) {
                case '1': return '▲';
                case '2': return '▲';
                case '4': return '▼';
                case '5': return '▼';
                case '0':
                default: return '-';
              }
            };

            let tableHTML = '<h3>일별거래상세</h3>';
            tableHTML += '<table class="daily-trading-table"><thead><tr>';
            const headers = [
              '일자', '종가', '대비기호', '전일대비', '등락율', '거래량', '거래대금',
              '장전거래량', '장전거래비중', '장중거래량', '장중거래비중', '장후거래량', '장후거래비중',
              '체결강도', '외인보유', '외인비중', '외인순매수', '기관순매수', '개인순매수',
              '외국계', '신용잔고율', '프로그램'
            ];
            headers.forEach(h => tableHTML += `<th>${h}</th>`);
            tableHTML += '</tr></thead><tbody>';

            dailyTradingData.forEach((item: any) => {
              const signSymbol = getSignSymbol(item.pred_pre_sig);
              tableHTML += '<tr>';
              tableHTML += `<td>${formatDate(item.dt)}</td>`;
              tableHTML += `<td>${formatNumber(item.close_pric)}</td>`;
              tableHTML += `<td>${signSymbol}</td>`;
              tableHTML += `<td>${formatNumber(item.pred_pre)}</td>`;
              tableHTML += `<td>${item.flu_rt}%</td>`;
              tableHTML += `<td>${formatNumber(item.trde_qty)}</td>`;
              tableHTML += `<td>${formatNumber(item.trde_prica)}</td>`;
              tableHTML += `<td>${formatNumber(item.bf_mkrt_trde_qty)}</td>`;
              tableHTML += `<td>${item.bf_mkrt_trde_wght || '-'}</td>`;
              tableHTML += `<td>${formatNumber(item.opmr_trde_qty)}</td>`;
              tableHTML += `<td>${item.opmr_trde_wght || '-'}</td>`;
              tableHTML += `<td>${formatNumber(item.af_mkrt_trde_qty)}</td>`;
              tableHTML += `<td>${item.af_mkrt_trde_wght || '-'}</td>`;
              tableHTML += `<td>${item.cntr_str || '-'}</td>`;
              tableHTML += `<td>${formatNumber(item.for_poss)}</td>`;
              tableHTML += `<td>${item.for_wght || '-'}</td>`;
              tableHTML += `<td>${formatNumber(item.for_netprps)}</td>`;
              tableHTML += `<td>${formatNumber(item.orgn_netprps)}</td>`;
              tableHTML += `<td>${formatNumber(item.ind_netprps)}</td>`;
              tableHTML += `<td>${formatNumber(item.frgn)}</td>`;
              tableHTML += `<td>${item.crd_remn_rt || '-'}</td>`;
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
          selectedStockCode = target.dataset.code;
          stockQueryInput.value = target.textContent; // Show selected stock
          suggestionsContainer.innerHTML = '';
          suggestionsContainer.style.display = 'none';
        }
      });

      submitBtn.addEventListener('click', fetchAndDisplayDailyTradingDetails);
    } else if (actionId === 'ka10016') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>신고저가요청 (ka10016)</h1>
        <div class="horizontal-form">
          <div class="form-row">
            <div class="form-field">
              <label for="market-type-input-ka10016">시장구분:</label>
              <select id="market-type-input-ka10016" name="market-type">
                <option value="000">전체</option>
                <option value="001">코스피</option>
                <option value="101">코스닥</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="new-high-low-type-input-ka10016">신고저구분:</label>
              <select id="new-high-low-type-input-ka10016" name="new-high-low-type">
                <option value="1">신고가</option>
                <option value="2">신저가</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="high-low-close-type-input-ka10016">고저종구분:</label>
              <select id="high-low-close-type-input-ka10016" name="high-low-close-type">
                <option value="1">고저기준</option>
                <option value="2">종가기준</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-field">
              <label for="stock-condition-input-ka10016">종목조건:</label>
              <select id="stock-condition-input-ka10016" name="stock-condition">
                <option value="0">전체조회</option>
                <option value="1">관리종목제외</option>
                <option value="3">우선주제외</option>
                <option value="5">증100제외</option>
                <option value="6">증100만보기</option>
                <option value="7">증40만보기</option>
                <option value="8">증30만보기</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="trade-qty-type-input-ka10016">거래량구분:</label>
              <select id="trade-qty-type-input-ka10016" name="trade-qty-type">
                <option value="00000">전체조회</option>
                <option value="00010">만주이상</option>
                <option value="00050">5만주이상</option>
                <option value="00100">10만주이상</option>
                <option value="00150">15만주이상</option>
                <option value="00200">20만주이상</option>
                <option value="00300">30만주이상</option>
                <option value="00500">50만주이상</option>
                <option value="01000">백만주이상</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="credit-condition-input-ka10016">신용조건:</label>
              <select id="credit-condition-input-ka10016" name="credit-condition">
                <option value="0">전체조회</option>
                <option value="1">신용융자A군</option>
                <option value="2">신용융자B군</option>
                <option value="3">신용융자C군</option>
                <option value="4">신용융자D군</option>
                <option value="7">신용융자E군</option>
                <option value="9">신용융자전체</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-field">
              <label for="updown-include-input-ka10016">상하한포함:</label>
              <select id="updown-include-input-ka10016" name="updown-include">
                <option value="0">미포함</option>
                <option value="1">포함</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="period-input-ka10016">기간:</label>
              <select id="period-input-ka10016" name="period">
                <option value="5">5일</option>
                <option value="10">10일</option>
                <option value="20">20일</option>
                <option value="60">60일</option>
                <option value="250">250일</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="exchange-type-input-ka10016">거래소구분:</label>
              <select id="exchange-type-input-ka10016" name="exchange-type">
                <option value="1">KRX</option>
                <option value="2">NXT</option>
                <option value="3">통합</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <button id="new-high-low-submit-btn">조회</button>
          </div>
        </div>
        <div id="new-high-low-result"></div>
      `;

      const marketTypeInput = document.getElementById('market-type-input-ka10016') as HTMLSelectElement;
      const newHighLowTypeInput = document.getElementById('new-high-low-type-input-ka10016') as HTMLSelectElement;
      const highLowCloseTypeInput = document.getElementById('high-low-close-type-input-ka10016') as HTMLSelectElement;
      const stockConditionInput = document.getElementById('stock-condition-input-ka10016') as HTMLSelectElement;
      const tradeQtyTypeInput = document.getElementById('trade-qty-type-input-ka10016') as HTMLSelectElement;
      const creditConditionInput = document.getElementById('credit-condition-input-ka10016') as HTMLSelectElement;
      const upDownIncludeInput = document.getElementById('updown-include-input-ka10016') as HTMLSelectElement;
      const periodInput = document.getElementById('period-input-ka10016') as HTMLSelectElement;
      const exchangeTypeInput = document.getElementById('exchange-type-input-ka10016') as HTMLSelectElement;
      const submitBtn = document.getElementById('new-high-low-submit-btn') as HTMLButtonElement;
      const resultDiv = document.getElementById('new-high-low-result') as HTMLDivElement;

      const fetchAndDisplayNewHighLowData = async () => {
        resultDiv.innerHTML = 'Fetching new/high-low price data...';
        
        try {
          const result = await window.electronAPI.invoke('get-new-high-low-data', {
            marketType: marketTypeInput.value,
            newHighLowType: newHighLowTypeInput.value,
            highLowCloseType: highLowCloseTypeInput.value,
            stockCondition: stockConditionInput.value,
            tradeQtyType: tradeQtyTypeInput.value,
            creditCondition: creditConditionInput.value,
            upDownInclude: upDownIncludeInput.value,
            period: periodInput.value,
            exchangeType: exchangeTypeInput.value,
            token: accessToken,
          });

          if (result.success) {
            const newHighLowData = result.newHighLowData;
            
            if (!newHighLowData || newHighLowData.length === 0) {
              resultDiv.innerHTML = '<p>조회된 데이터가 없습니다.</p>';
              return;
            }

            const formatNumber = (value: string) => {
              if (!value || value === '' || value === '0') return '0';
              const cleanValue = value.replace(/[+\-]/g, '');
              const num = Number(cleanValue);
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value;
            };

            const getSignSymbol = (signCode: string) => {
              switch(signCode) {
                case '1': return '△';
                case '2': return '▲';
                case '3': return '-';
                case '4': return '▼';
                case '5': return '▽';
                default: return '';
              }
            };

            let tableHTML = '<table class="new-high-low-table"><thead><tr>';
            const headers = [
              '종목코드', '종목명', '현재가', '전일대비', '등락률', '거래량', 
              '전일거래량대비율', '매도호가', '매수호가', '고가', '저가'
            ];
            headers.forEach(h => tableHTML += `<th>${h}</th>`);
            tableHTML += '</tr></thead><tbody>';

            newHighLowData.forEach((item: any) => {
              const currentPrice = formatNumber(item.cur_prc || '0');
              const previousDiff = formatNumber(item.pred_pre || '0');
              const changeRate = item.flu_rt || '0';
              const volume = formatNumber(item.trde_qty || '0');
              const volumeRatio = item.pred_trde_qty_pre_rt || '0';
              const sellBid = formatNumber(item.sel_bid || '0');
              const buyBid = formatNumber(item.buy_bid || '0');
              const highPrice = formatNumber(item.high_pric || '0');
              const lowPrice = formatNumber(item.low_pric || '0');
              const signSymbol = getSignSymbol(item.pred_pre_sig);

              tableHTML += '<tr>';
              tableHTML += `<td>${item.stk_cd || ''}</td>`;
              tableHTML += `<td>${item.stk_nm || ''}</td>`;
              tableHTML += `<td>${currentPrice}</td>`;
              tableHTML += `<td>${signSymbol}${previousDiff}</td>`;
              tableHTML += `<td>${changeRate}%</td>`;
              tableHTML += `<td>${volume}</td>`;
              tableHTML += `<td>${volumeRatio}%</td>`;
              tableHTML += `<td>${sellBid}</td>`;
              tableHTML += `<td>${buyBid}</td>`;
              tableHTML += `<td>${highPrice}</td>`;
              tableHTML += `<td>${lowPrice}</td>`;
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

      submitBtn.addEventListener('click', fetchAndDisplayNewHighLowData);
    } else if (actionId === 'ka10017') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>상하한가요청 (ka10017)</h1>
        <div class="horizontal-form">
          <div class="form-row">
            <div class="form-field">
              <label for="market-type-input-ka10017">시장구분:</label>
              <select id="market-type-input-ka10017" name="market-type">
                <option value="000">전체</option>
                <option value="001">코스피</option>
                <option value="101">코스닥</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="updown-type-input-ka10017">상하한구분:</label>
              <select id="updown-type-input-ka10017" name="updown-type">
                <option value="1">상한</option>
                <option value="2">상승</option>
                <option value="3">보합</option>
                <option value="4">하한</option>
                <option value="5">하락</option>
                <option value="6">전일상한</option>
                <option value="7">전일하한</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="sort-type-input-ka10017">정렬구분:</label>
              <select id="sort-type-input-ka10017" name="sort-type">
                <option value="1">종목코드순</option>
                <option value="2">연속횟수순(상위100개)</option>
                <option value="3">등락률순</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-field">
              <label for="stock-condition-input-ka10017">종목조건:</label>
              <select id="stock-condition-input-ka10017" name="stock-condition">
                <option value="0">전체조회</option>
                <option value="1">관리종목제외</option>
                <option value="3">우선주제외</option>
                <option value="4">우선주+관리종목제외</option>
                <option value="5">증100제외</option>
                <option value="6">증100만보기</option>
                <option value="7">증40만보기</option>
                <option value="8">증30만보기</option>
                <option value="9">증20만보기</option>
                <option value="10">우선주+관리종목+환기종목제외</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="trade-qty-type-input-ka10017">거래량구분:</label>
              <select id="trade-qty-type-input-ka10017" name="trade-qty-type">
                <option value="00000">전체조회</option>
                <option value="00010">만주이상</option>
                <option value="00050">5만주이상</option>
                <option value="00100">10만주이상</option>
                <option value="00150">15만주이상</option>
                <option value="00200">20만주이상</option>
                <option value="00300">30만주이상</option>
                <option value="00500">50만주이상</option>
                <option value="01000">백만주이상</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="credit-condition-input-ka10017">신용조건:</label>
              <select id="credit-condition-input-ka10017" name="credit-condition">
                <option value="0">전체조회</option>
                <option value="1">신용융자A군</option>
                <option value="2">신용융자B군</option>
                <option value="3">신용융자C군</option>
                <option value="4">신용융자D군</option>
                <option value="7">신용융자E군</option>
                <option value="9">신용융자전체</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-field">
              <label for="trade-gold-type-input-ka10017">매매금구분:</label>
              <select id="trade-gold-type-input-ka10017" name="trade-gold-type">
                <option value="0">전체조회</option>
                <option value="1">1천원미만</option>
                <option value="2">1천원~2천원</option>
                <option value="3">2천원~3천원</option>
                <option value="4">5천원~1만원</option>
                <option value="5">1만원이상</option>
                <option value="8">1천원이상</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="exchange-type-input-ka10017">거래소구분:</label>
              <select id="exchange-type-input-ka10017" name="exchange-type">
                <option value="1">KRX</option>
                <option value="2">NXT</option>
                <option value="3">통합</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <button id="upper-lower-limit-submit-btn">조회</button>
          </div>
        </div>
        <div id="upper-lower-limit-result"></div>
      `;

      const marketTypeInput = document.getElementById('market-type-input-ka10017') as HTMLSelectElement;
      const upDownTypeInput = document.getElementById('updown-type-input-ka10017') as HTMLSelectElement;
      const sortTypeInput = document.getElementById('sort-type-input-ka10017') as HTMLSelectElement;
      const stockConditionInput = document.getElementById('stock-condition-input-ka10017') as HTMLSelectElement;
      const tradeQtyTypeInput = document.getElementById('trade-qty-type-input-ka10017') as HTMLSelectElement;
      const creditConditionInput = document.getElementById('credit-condition-input-ka10017') as HTMLSelectElement;
      const tradeGoldTypeInput = document.getElementById('trade-gold-type-input-ka10017') as HTMLSelectElement;
      const exchangeTypeInput = document.getElementById('exchange-type-input-ka10017') as HTMLSelectElement;
      const submitBtn = document.getElementById('upper-lower-limit-submit-btn') as HTMLButtonElement;
      const resultDiv = document.getElementById('upper-lower-limit-result') as HTMLDivElement;

      const fetchAndDisplayUpperLowerLimitData = async () => {
        resultDiv.innerHTML = 'Fetching upper/lower limit price data...';
        
        try {
          const result = await window.electronAPI.invoke('get-upper-lower-limit-data', {
            marketType: marketTypeInput.value,
            upDownType: upDownTypeInput.value,
            sortType: sortTypeInput.value,
            stockCondition: stockConditionInput.value,
            tradeQtyType: tradeQtyTypeInput.value,
            creditCondition: creditConditionInput.value,
            tradeGoldType: tradeGoldTypeInput.value,
            exchangeType: exchangeTypeInput.value,
            token: accessToken,
          });

          if (result.success) {
            const upperLowerLimitData = result.upperLowerLimitData;
            
            if (!upperLowerLimitData || upperLowerLimitData.length === 0) {
              resultDiv.innerHTML = '<p>조회된 데이터가 없습니다.</p>';
              return;
            }

            const formatNumber = (value: string) => {
              if (!value || value === '' || value === '0') return '0';
              const cleanValue = value.replace(/[+\-]/g, '');
              const num = Number(cleanValue);
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value;
            };

            const getSignSymbol = (signCode: string) => {
              switch(signCode) {
                case '1': return '△';
                case '2': return '▲';
                case '3': return '-';
                case '4': return '▼';
                case '5': return '▽';
                default: return '';
              }
            };

            let tableHTML = '<table class="upper-lower-limit-table"><thead><tr>';
            const headers = [
              '종목코드', '종목정보', '종목명', '현재가', '전일대비', '등락률', '거래량', 
              '전일거래량', '매도잔량', '매도호가', '매수호가', '매수잔량', '횟수'
            ];
            headers.forEach(h => tableHTML += `<th>${h}</th>`);
            tableHTML += '</tr></thead><tbody>';

            upperLowerLimitData.forEach((item: any) => {
              const currentPrice = formatNumber(item.cur_prc || '0');
              const previousDiff = formatNumber(item.pred_pre || '0');
              const changeRate = item.flu_rt || '0';
              const volume = formatNumber(item.trde_qty || '0');
              const prevVolume = formatNumber(item.pred_trde_qty || '0');
              const sellReq = formatNumber(item.sel_req || '0');
              const sellBid = formatNumber(item.sel_bid || '0');
              const buyBid = formatNumber(item.buy_bid || '0');
              const buyReq = formatNumber(item.buy_req || '0');
              const count = item.cnt || '0';
              const signSymbol = getSignSymbol(item.pred_pre_sig);

              tableHTML += '<tr>';
              tableHTML += `<td>${item.stk_cd || ''}</td>`;
              tableHTML += `<td>${item.stk_infr || ''}</td>`;
              tableHTML += `<td>${item.stk_nm || ''}</td>`;
              tableHTML += `<td>${currentPrice}</td>`;
              tableHTML += `<td>${signSymbol}${previousDiff}</td>`;
              tableHTML += `<td>${changeRate}%</td>`;
              tableHTML += `<td>${volume}</td>`;
              tableHTML += `<td>${prevVolume}</td>`;
              tableHTML += `<td>${sellReq}</td>`;
              tableHTML += `<td>${sellBid}</td>`;
              tableHTML += `<td>${buyBid}</td>`;
              tableHTML += `<td>${buyReq}</td>`;
              tableHTML += `<td>${count}</td>`;
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

      submitBtn.addEventListener('click', fetchAndDisplayUpperLowerLimitData);
    } else if (actionId === 'ka10018') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>고저가근접요청 (ka10018)</h1>
        <div class="horizontal-form">
          <div class="form-row">
            <div class="form-field">
              <label for="high-low-type-input-ka10018">고저구분:</label>
              <select id="high-low-type-input-ka10018" name="high-low-type">
                <option value="1">고가</option>
                <option value="2">저가</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="approach-rate-input-ka10018">근접율:</label>
              <select id="approach-rate-input-ka10018" name="approach-rate">
                <option value="05">0.5%</option>
                <option value="10">1.0%</option>
                <option value="15">1.5%</option>
                <option value="20">2.0%</option>
                <option value="25">2.5%</option>
                <option value="30">3.0%</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="market-type-input-ka10018">시장구분:</label>
              <select id="market-type-input-ka10018" name="market-type">
                <option value="000">전체</option>
                <option value="001">코스피</option>
                <option value="101">코스닥</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-field">
              <label for="trade-qty-type-input-ka10018">거래량구분:</label>
              <select id="trade-qty-type-input-ka10018" name="trade-qty-type">
                <option value="00000">전체조회</option>
                <option value="00010">만주이상</option>
                <option value="00050">5만주이상</option>
                <option value="00100">10만주이상</option>
                <option value="00150">15만주이상</option>
                <option value="00200">20만주이상</option>
                <option value="00300">30만주이상</option>
                <option value="00500">50만주이상</option>
                <option value="01000">백만주이상</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="stock-condition-input-ka10018">종목조건:</label>
              <select id="stock-condition-input-ka10018" name="stock-condition">
                <option value="0">전체조회</option>
                <option value="1">관리종목제외</option>
                <option value="3">우선주제외</option>
                <option value="5">증100제외</option>
                <option value="6">증100만보기</option>
                <option value="7">증40만보기</option>
                <option value="8">증30만보기</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="credit-condition-input-ka10018">신용조건:</label>
              <select id="credit-condition-input-ka10018" name="credit-condition">
                <option value="0">전체조회</option>
                <option value="1">신용융자A군</option>
                <option value="2">신용융자B군</option>
                <option value="3">신용융자C군</option>
                <option value="4">신용융자D군</option>
                <option value="7">신용융자E군</option>
                <option value="9">신용융자전체</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-field">
              <label for="exchange-type-input-ka10018">거래소구분:</label>
              <select id="exchange-type-input-ka10018" name="exchange-type">
                <option value="1">KRX</option>
                <option value="2">NXT</option>
                <option value="3">통합</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <button id="high-low-approach-submit-btn">조회</button>
          </div>
        </div>
        <div id="high-low-approach-result"></div>
      `;

      const highLowTypeInput = document.getElementById('high-low-type-input-ka10018') as HTMLSelectElement;
      const approachRateInput = document.getElementById('approach-rate-input-ka10018') as HTMLSelectElement;
      const marketTypeInput = document.getElementById('market-type-input-ka10018') as HTMLSelectElement;
      const tradeQtyTypeInput = document.getElementById('trade-qty-type-input-ka10018') as HTMLSelectElement;
      const stockConditionInput = document.getElementById('stock-condition-input-ka10018') as HTMLSelectElement;
      const creditConditionInput = document.getElementById('credit-condition-input-ka10018') as HTMLSelectElement;
      const exchangeTypeInput = document.getElementById('exchange-type-input-ka10018') as HTMLSelectElement;
      const submitBtn = document.getElementById('high-low-approach-submit-btn') as HTMLButtonElement;
      const resultDiv = document.getElementById('high-low-approach-result') as HTMLDivElement;

      const fetchAndDisplayHighLowApproachData = async () => {
        resultDiv.innerHTML = 'Fetching high-low approach data...';
        
        try {
          const result = await window.electronAPI.invoke('get-high-low-approach-data', {
            highLowType: highLowTypeInput.value,
            approachRate: approachRateInput.value,
            marketType: marketTypeInput.value,
            tradeQtyType: tradeQtyTypeInput.value,
            stockCondition: stockConditionInput.value,
            creditCondition: creditConditionInput.value,
            exchangeType: exchangeTypeInput.value,
            token: accessToken,
          });

          if (result.success) {
            const highLowApproachData = result.highLowApproachData;
            
            if (!highLowApproachData || highLowApproachData.length === 0) {
              resultDiv.innerHTML = '<p>조회된 데이터가 없습니다.</p>';
              return;
            }

            const formatNumber = (value: string) => {
              if (!value || value === '' || value === '0') return '0';
              const cleanValue = value.replace(/[+\-]/g, '');
              const num = Number(cleanValue);
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value;
            };

            const getSignSymbol = (signCode: string) => {
              switch(signCode) {
                case '1': return '△';
                case '2': return '▲';
                case '3': return '-';
                case '4': return '▼';
                case '5': return '▽';
                default: return '';
              }
            };

            let tableHTML = '<table class="high-low-approach-table"><thead><tr>';
            const headers = [
              '종목코드', '종목명', '현재가', '전일대비', '등락률', '거래량', 
              '매도호가', '매수호가', '당일고가', '당일저가'
            ];
            headers.forEach(h => tableHTML += `<th>${h}</th>`);
            tableHTML += '</tr></thead><tbody>';

            highLowApproachData.forEach((item: any) => {
              const currentPrice = formatNumber(item.cur_prc || '0');
              const previousDiff = formatNumber(item.pred_pre || '0');
              const changeRate = item.flu_rt || '0';
              const volume = formatNumber(item.trde_qty || '0');
              const sellBid = formatNumber(item.sel_bid || '0');
              const buyBid = formatNumber(item.buy_bid || '0');
              const todayHigh = formatNumber(item.tdy_high_pric || '0');
              const todayLow = formatNumber(item.tdy_low_pric || '0');
              const signSymbol = getSignSymbol(item.pred_pre_sig);

              tableHTML += '<tr>';
              tableHTML += `<td>${item.stk_cd || ''}</td>`;
              tableHTML += `<td>${item.stk_nm || ''}</td>`;
              tableHTML += `<td>${currentPrice}</td>`;
              tableHTML += `<td>${signSymbol}${previousDiff}</td>`;
              tableHTML += `<td>${changeRate}%</td>`;
              tableHTML += `<td>${volume}</td>`;
              tableHTML += `<td>${sellBid}</td>`;
              tableHTML += `<td>${buyBid}</td>`;
              tableHTML += `<td>${todayHigh}</td>`;
              tableHTML += `<td>${todayLow}</td>`;
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

      submitBtn.addEventListener('click', fetchAndDisplayHighLowApproachData);
    } else if (actionId === 'ka10019') {
      if (!mainContent) return;

      mainContent.innerHTML = `
        <h1>가격급등락요청 (ka10019)</h1>
        <div class="horizontal-form">
          <div class="form-row">
            <div class="form-field">
              <label for="market-type-input-ka10019">시장구분:</label>
              <select id="market-type-input-ka10019" name="market-type">
                <option value="000">전체</option>
                <option value="001">코스피</option>
                <option value="101">코스닥</option>
                <option value="201">코스피200</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="fluctuation-type-input-ka10019">등락구분:</label>
              <select id="fluctuation-type-input-ka10019" name="fluctuation-type">
                <option value="1">급등</option>
                <option value="2">급락</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="time-type-input-ka10019">시간구분:</label>
              <select id="time-type-input-ka10019" name="time-type">
                <option value="1">분전</option>
                <option value="2">일전</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="time-input-ka10019">시간:</label>
              <input type="number" id="time-input-ka10019" name="time" value="60" min="1" max="99" placeholder="분 혹은 일 입력">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-field">
              <label for="trade-qty-type-input-ka10019">거래량구분:</label>
              <select id="trade-qty-type-input-ka10019" name="trade-qty-type">
                <option value="00000">전체조회</option>
                <option value="00010">만주이상</option>
                <option value="00050">5만주이상</option>
                <option value="00100">10만주이상</option>
                <option value="00150">15만주이상</option>
                <option value="00200">20만주이상</option>
                <option value="00300">30만주이상</option>
                <option value="00500">50만주이상</option>
                <option value="01000">백만주이상</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="stock-condition-input-ka10019">종목조건:</label>
              <select id="stock-condition-input-ka10019" name="stock-condition">
                <option value="0">전체조회</option>
                <option value="1">관리종목제외</option>
                <option value="3">우선주제외</option>
                <option value="5">증100제외</option>
                <option value="6">증100만보기</option>
                <option value="7">증40만보기</option>
                <option value="8">증30만보기</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="credit-condition-input-ka10019">신용조건:</label>
              <select id="credit-condition-input-ka10019" name="credit-condition">
                <option value="0">전체조회</option>
                <option value="1">신용융자A군</option>
                <option value="2">신용융자B군</option>
                <option value="3">신용융자C군</option>
                <option value="4">신용융자D군</option>
                <option value="7">신용융자E군</option>
                <option value="9">신용융자전체</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-field">
              <label for="price-condition-input-ka10019">가격조건:</label>
              <select id="price-condition-input-ka10019" name="price-condition">
                <option value="0">전체조회</option>
                <option value="1">1천원미만</option>
                <option value="2">1천원~2천원</option>
                <option value="3">2천원~3천원</option>
                <option value="4">5천원~1만원</option>
                <option value="5">1만원이상</option>
                <option value="8">1천원이상</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="updown-include-input-ka10019">상하한포함:</label>
              <select id="updown-include-input-ka10019" name="updown-include">
                <option value="0">미포함</option>
                <option value="1">포함</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="exchange-type-input-ka10019">거래소구분:</label>
              <select id="exchange-type-input-ka10019" name="exchange-type">
                <option value="1">KRX</option>
                <option value="2">NXT</option>
                <option value="3">통합</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <button id="price-surge-plunge-submit-btn">조회</button>
          </div>
        </div>
        <div id="price-surge-plunge-result"></div>
      `;

      const marketTypeInput = document.getElementById('market-type-input-ka10019') as HTMLSelectElement;
      const fluctuationTypeInput = document.getElementById('fluctuation-type-input-ka10019') as HTMLSelectElement;
      const timeTypeInput = document.getElementById('time-type-input-ka10019') as HTMLSelectElement;
      const timeInput = document.getElementById('time-input-ka10019') as HTMLInputElement;
      const tradeQtyTypeInput = document.getElementById('trade-qty-type-input-ka10019') as HTMLSelectElement;
      const stockConditionInput = document.getElementById('stock-condition-input-ka10019') as HTMLSelectElement;
      const creditConditionInput = document.getElementById('credit-condition-input-ka10019') as HTMLSelectElement;
      const priceConditionInput = document.getElementById('price-condition-input-ka10019') as HTMLSelectElement;
      const upDownIncludeInput = document.getElementById('updown-include-input-ka10019') as HTMLSelectElement;
      const exchangeTypeInput = document.getElementById('exchange-type-input-ka10019') as HTMLSelectElement;
      const submitBtn = document.getElementById('price-surge-plunge-submit-btn') as HTMLButtonElement;
      const resultDiv = document.getElementById('price-surge-plunge-result') as HTMLDivElement;

      const fetchAndDisplayPriceSurgePlungeData = async () => {
        resultDiv.innerHTML = 'Fetching price surge/plunge data...';
        
        try {
          const result = await window.electronAPI.invoke('get-price-surge-plunge-data', {
            marketType: marketTypeInput.value,
            fluctuationType: fluctuationTypeInput.value,
            timeType: timeTypeInput.value,
            time: timeInput.value.padStart(2, '0'),
            tradeQtyType: tradeQtyTypeInput.value,
            stockCondition: stockConditionInput.value,
            creditCondition: creditConditionInput.value,
            priceCondition: priceConditionInput.value,
            upDownInclude: upDownIncludeInput.value,
            exchangeType: exchangeTypeInput.value,
            token: accessToken,
          });

          if (result.success) {
            const priceSurgePlungeData = result.priceSurgePlungeData;
            
            if (!priceSurgePlungeData || priceSurgePlungeData.length === 0) {
              resultDiv.innerHTML = '<p>조회된 데이터가 없습니다.</p>';
              return;
            }

            const formatNumber = (value: string) => {
              if (!value || value === '' || value === '0') return '0';
              const cleanValue = value.replace(/[+\-]/g, '');
              const num = Number(cleanValue);
              if (!isNaN(num)) {
                return num.toLocaleString('en-US');
              }
              return value;
            };

            const getSignSymbol = (signCode: string) => {
              switch(signCode) {
                case '1': return '△';
                case '2': return '▲';
                case '3': return '-';
                case '4': return '▼';
                case '5': return '▽';
                default: return '';
              }
            };

            let tableHTML = '<table class="price-surge-plunge-table"><thead><tr>';
            const headers = [
              '종목코드', '종목분류', '종목명', '전일대비', '등락률', '기준가', 
              '현재가', '기준대비', '거래량', '급등률'
            ];
            headers.forEach(h => tableHTML += `<th>${h}</th>`);
            tableHTML += '</tr></thead><tbody>';

            priceSurgePlungeData.forEach((item: any) => {
              const previousDiff = formatNumber(item.pred_pre || '0');
              const changeRate = item.flu_rt || '0';
              const basePrice = formatNumber(item.base_pric || '0');
              const currentPrice = formatNumber(item.cur_prc || '0');
              const baseDiff = formatNumber(item.base_pre || '0');
              const volume = formatNumber(item.trde_qty || '0');
              const surgeRate = item.jmp_rt || '0';
              const signSymbol = getSignSymbol(item.pred_pre_sig);

              tableHTML += '<tr>';
              tableHTML += `<td>${item.stk_cd || ''}</td>`;
              tableHTML += `<td>${item.stk_cls || ''}</td>`;
              tableHTML += `<td>${item.stk_nm || ''}</td>`;
              tableHTML += `<td>${signSymbol}${previousDiff}</td>`;
              tableHTML += `<td>${changeRate}%</td>`;
              tableHTML += `<td>${basePrice}</td>`;
              tableHTML += `<td>${currentPrice}</td>`;
              tableHTML += `<td>${baseDiff}</td>`;
              tableHTML += `<td>${volume}</td>`;
              tableHTML += `<td>${surgeRate}%</td>`;
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

      submitBtn.addEventListener('click', fetchAndDisplayPriceSurgePlungeData);
    }
  });
});

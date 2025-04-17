document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
          showError("Plik nie zawiera żadnych arkuszy.");
          return;
        }
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to raw form with cell references
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        
        if (rawData.length === 0) {
          showError("Arkusz jest pusty.");
          return;
        }
        
        // Find index and category headers
        let indexCol = -1;
        let categoryCol = -1;
        let headerRow = -1;
        
        // Scan the first 10 rows to find headers
        const maxScanRows = Math.min(10, rawData.length);
        
        for (let r = 0; r < maxScanRows; r++) {
          const row = rawData[r];
          if (!row) continue;
          
          for (let c = 0; c < row.length; c++) {
            const cell = String(row[c] || "").trim().toLowerCase();
            
            // Check for index header
            if (cell === 'index' || cell === 'indeks' || 
                cell === 'kod' || cell === 'indeks produktu') {
              indexCol = c;
              headerRow = r;
            }
            
            // Check for category header
            if (cell === 'kategoria produktu' || cell === 'kategoria' || 
                cell === 'grupa' || cell === 'typ produktu') {
              categoryCol = c;
              headerRow = r;
            }
          }
          
          // If we found both headers, stop searching
          if (indexCol !== -1 && categoryCol !== -1) {
            break;
          }
        }
        
        // If we didn't find indexes column, we can't continue
        if (indexCol === -1) {
          showError("Nie znaleziono kolumny INDEX/INDEKS w pierwszych 10 wierszach.");
          return;
        }
        
        // If we didn't find the category column, we'll use a default
        const useDefaultCategory = (categoryCol === -1);
        
        // Extract data from the columns
        const grouped = {};
        let totalIndexes = 0;
        
        // Start from the row after headers
        for (let r = headerRow + 1; r < rawData.length; r++) {
          const row = rawData[r];
          if (!row || row.length <= indexCol) continue;
          
          const indexValue = row[indexCol];
          if (!indexValue) continue;
          
          let category = useDefaultCategory ? "wszystkie" : (row[categoryCol] || "");
          
          // Normalize the category
          category = String(category).trim().toLowerCase();
          if (category === "") {
            category = "inne";
          }
          
          if (!grouped[category]) {
            grouped[category] = [];
          }
          
          const indexStr = String(indexValue).trim();
          if (indexStr) {
            grouped[category].push(indexStr);
            totalIndexes++;
          }
        }
        
        // Display the results
        displayResults(grouped, totalIndexes);
        
        // Show detected columns
        const columnsInfo = document.createElement("div");
        columnsInfo.style.marginTop = "10px";
        columnsInfo.style.padding = "8px";
        columnsInfo.style.backgroundColor = "#f0f7ff";
        columnsInfo.style.borderRadius = "5px";
        columnsInfo.style.fontSize = "12px";
        columnsInfo.style.border = "1px solid #d0e3ff";
        
        const colNames = [];
        if (indexCol !== -1) colNames.push(`Kolumna INDEX: ${indexCol + 1} (${getColumnLetter(indexCol)})`);
        if (categoryCol !== -1) colNames.push(`Kolumna KATEGORIA: ${categoryCol + 1} (${getColumnLetter(categoryCol)})`);
        columnsInfo.textContent = colNames.join(", ") + `, Wiersz nagłówków: ${headerRow + 1}`;
        
        document.getElementById('output').appendChild(columnsInfo);
        
      } catch (error) {
        showError(`Wystąpił błąd podczas przetwarzania pliku: ${error.message}`);
        console.error(error);
      }
    };
    
    reader.onerror = function() {
      showError("Nie udało się wczytać pliku.");
    };
    
    reader.readAsArrayBuffer(file);
  });
  
  // Convert column index to Excel letter (A, B, C, ..., AA, AB, etc.)
  function getColumnLetter(columnIndex) {
    let temp, letter = '';
    let col = columnIndex;
    
    while (col >= 0) {
      temp = col % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      col = (col - temp) / 26 - 1;
    }
    
    return letter;
  }
  
  function displayResults(grouped, totalIndexes) {
    const output = document.getElementById('output');
    output.innerHTML = "";
    document.getElementById("totalCount").textContent = `(łącznie: ${totalIndexes} indeksów)`;
    
    // Convert to sorted array of categories
    const categories = Object.keys(grouped).sort();
    
    if (categories.length === 0) {
      showError("Nie znaleziono żadnych danych do wyświetlenia.");
      return;
    }
    
    let rowIndex = 0;
    for (const category of categories) {
      const indexes = grouped[category].sort();
      
      const block = document.createElement("div");
      block.className = "category-block";
      block.style.backgroundColor = rowIndex % 2 === 0 ? "#ffffff" : "#f8f8f8";
      block.style.padding = "10px";
      block.style.marginBottom = "10px";
      block.style.borderRadius = "8px";
      //block.style.border = "1px solid #ddd";
      rowIndex++;
      
      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.style.marginBottom = "5px";
      
      const title = document.createElement("div");
      title.className = "category-title";
      title.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      title.style.fontWeight = "bold";
      
      const countSpan = document.createElement("span");
      countSpan.textContent = ` (${indexes.length})`;
      countSpan.style.fontSize = "0.8em";
      countSpan.style.color = "#666";
      title.appendChild(countSpan);
      
      const copyButton = document.createElement("button");
      copyButton.textContent = "📋";
      copyButton.title = "Kopiuj indeksy";
      copyButton.style.border = "none";
      copyButton.style.background = "transparent";
      copyButton.style.cursor = "pointer";
      copyButton.style.fontSize = "16px";
      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(indexes.join(", "))
          .then(() => {
            copyButton.textContent = "✅";
            setTimeout(() => copyButton.textContent = "📋", 1500);
          })
          .catch(() => alert("Nie udało się skopiować"));
      });
      
      header.appendChild(title);
      header.appendChild(copyButton);
      
      const content = document.createElement("div");
      content.textContent = indexes.join(", ");
      content.style.wordBreak = "break-all";
      content.style.lineHeight = "1.4";
      
      block.appendChild(header);
      block.appendChild(content);
      output.appendChild(block);
    }
  }
  
  function showError(message) {
    const output = document.getElementById('output');
    output.innerHTML = `<div class="error" style="color: #d32f2f; padding: 10px; background-color: #fff8f8; border-radius: 4px; border: 1px solid #ffcccc; font-weight: bold;">${message}</div>`;
    document.getElementById("totalCount").textContent = "";
  }
  
  document.getElementById("clearBtn").addEventListener("click", () => {
    document.getElementById("output").innerHTML = "";
    document.getElementById("totalCount").textContent = "";
    document.getElementById("fileInput").value = "";
  });
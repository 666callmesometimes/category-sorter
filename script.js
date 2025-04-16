document.getElementById('fileInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);

    const grouped = {};

    json.forEach(row => {
      let category = row["KATEGORIA PRODUKTU"] || "";
      const index = row["INDEX"];
      if (!index) return;
    
      category = category.trim().toLowerCase(); // ujednolicamy
    
      if (category === "") {
        category = "inne";
      }
    
      if (!grouped[category]) {
        grouped[category] = [];
      }
    
      grouped[category].push(index);
    });
    

    const totalIndexes = json.filter(row => row["INDEX"]).length;

    document.getElementById("totalCount").textContent = `(łącznie: ${totalIndexes} indeksów)`;   

    const output = document.getElementById('output');
    output.innerHTML = "";

    let rowIndex = 0;

    for (const [category, indexes] of Object.entries(grouped)) {
      const sorted = indexes.sort();

      const block = document.createElement("div");
      block.className = "category-block";
      block.style.backgroundColor = rowIndex % 2 === 0 ? "#ffffff" : "#f0f0f0";
      rowIndex++;

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";

      const title = document.createElement("div");
      title.className = "category-title";
      title.textContent = category.charAt(0).toUpperCase() + category.slice(1);

      const copyButton = document.createElement("button");
      copyButton.textContent = "📋";
      copyButton.title = "Kopiuj ERP-y";
      copyButton.style.border = "none";
      copyButton.style.background = "transparent";
      copyButton.style.cursor = "pointer";
      copyButton.style.fontSize = "16px";

      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(sorted.join(", "))
          .then(() => {
            copyButton.textContent = "✅";
            setTimeout(() => copyButton.textContent = "📋", 1500);
          })
          .catch(() => alert("Nie udało się skopiować"));
      });

      header.appendChild(title);
      header.appendChild(copyButton);

      const content = document.createElement("div");
      content.textContent = sorted.join(", ");

      block.appendChild(header);
      block.appendChild(content);
      output.appendChild(block);
    }
  };

  reader.readAsArrayBuffer(file);
});

document.getElementById("clearBtn").addEventListener("click", () => {
  document.getElementById("output").innerHTML = "";
  document.getElementById("totalCount").textContent = "";
  document.getElementById("fileInput").value = ""; // reset inputa
});

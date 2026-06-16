// GLOBAL APP STATE
let members = [];
let selectedMemberId = null;
let gitHubSettings = {
  token: '',
  repo: '',
  branch: 'main',
  path: 'Torpedos.json'
};

// DEFAULT FALLBACK DATA (in case fetch fails or first run)
const DEFAULT_MEMBERS = [
  {
    "id": 1,
    "nickname": "feakz",
    "rank": "Lyderis",
    "online": true,
    "statusColor": "green",
    "personalInfo": {
      "firstName": "Mantas",
      "lastName": "Jankauskas",
      "birthDate": "1998-05-12",
      "phone": "555-12345"
    },
    "buyouts": [
      {
        "id": 101,
        "item": "Heavy Rifle",
        "quantity": 2,
        "price": 120000,
        "date": "2026-06-10T14:30"
      },
      {
        "id": 102,
        "item": "Apvalkalai (Bullets)",
        "quantity": 500,
        "price": 15000,
        "date": "2026-06-12T18:20"
      }
    ]
  },
  {
    "id": 2,
    "nickname": "onixiukas",
    "rank": "Torpeda",
    "online": true,
    "statusColor": "green",
    "personalInfo": {
      "firstName": "Karolis",
      "lastName": "Petraitis",
      "birthDate": "2001-09-24",
      "phone": "555-98765"
    },
    "buyouts": [
      {
        "id": 103,
        "item": "AP Pistol",
        "quantity": 3,
        "price": 90000,
        "date": "2026-06-14T20:15"
      },
      {
        "id": 104,
        "item": "Kainas (Kokainas)",
        "quantity": 50,
        "price": 25000,
        "date": "2026-06-15T22:00"
      }
    ]
  },
  {
    "id": 3,
    "nickname": "neimaras",
    "rank": "Valdyba",
    "online": false,
    "statusColor": "red",
    "personalInfo": {
      "firstName": "Tomas",
      "lastName": "Skauda",
      "birthDate": "1995-11-02",
      "phone": "555-44221"
    },
    "buyouts": [
      {
        "id": 105,
        "item": "Glock-18",
        "quantity": 1,
        "price": 25000,
        "date": "2026-06-08T11:05"
      }
    ]
  },
  {
    "id": 4,
    "nickname": "Fredisiovas",
    "rank": "Torpeda",
    "online": true,
    "statusColor": "orange",
    "personalInfo": {
      "firstName": "Fredi",
      "lastName": "Kriugeris",
      "birthDate": "2000-02-29",
      "phone": "555-66778"
    },
    "buyouts": [
      {
        "id": 106,
        "item": "Advanced Rifle",
        "quantity": 1,
        "price": 85000,
        "date": "2026-06-16T19:40"
      }
    ]
  },
  {
    "id": 5,
    "nickname": "kyxdzsds",
    "rank": "Naujokas",
    "online": false,
    "statusColor": "red",
    "personalInfo": {
      "firstName": "Arnas",
      "lastName": "Sabonis",
      "birthDate": "2004-07-15",
      "phone": "555-88990"
    },
    "buyouts": []
  }
];

// LIST OF ALL RANKS
const RANKS = ["Lyderis", "Pavaduotojas", "Direktorius", "Valdyba", "Torpeda", "Naujokas"];

// INITIALIZATION
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // Load GitHub settings from localStorage
  loadGitHubSettings();

  // Load database
  await loadDatabase();

  // Bind Navigation Tabs
  initNavigation();

  // Bind Search, Filter, Sort Controls
  initFilters();

  // Bind Modals & Action Buttons
  initActions();

  // Render Initial Views
  updateDashboard();
  renderMembersGrid();
  updateSyncStatusOnDashboard();
  populateRankFilterOptions();
});

// LOAD DATABASE
async function loadDatabase() {
  const localData = localStorage.getItem("torpedos_members");
  if (localData) {
    try {
      members = JSON.parse(localData);
      showToast("Duomenys sėkmingai užkrauti iš naršyklės atminties.", "info");
      return;
    } catch (e) {
      console.error("Klaida nuskaitant vietinius duomenis:", e);
    }
  }

  // If no local data, attempt to load from Torpedos.json (local file or URL)
  try {
    const response = await fetch("Torpedos.json");
    if (response.ok) {
      members = await response.json();
      saveToLocalStorage();
      showToast("Duomenys užkrauti iš Torpedos.json failo.", "success");
      return;
    }
  } catch (error) {
    console.warn("Nepavyko pasiekti Torpedos.json (galbūt veikia lokaliai be serverio). Naudojami pavyzdiniai duomenys.", error);
  }

  // Fallback to static array
  members = [...DEFAULT_MEMBERS];
  saveToLocalStorage();
  showToast("Užkrauti pavyzdiniai kartelio duomenys.", "info");
}

// SAVE DATA TO LOCAL STORAGE
function saveToLocalStorage() {
  localStorage.setItem("torpedos_members", JSON.stringify(members));
}

// NAVIGATION
function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");

      navButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(`tab-${tabId}`).classList.add("active");

      // Refresh data when navigating
      if (tabId === 'dashboard') {
        updateDashboard();
      } else if (tabId === 'members') {
        renderMembersGrid();
      }
    });
  });

  // Link inside dashboard to show all members
  document.getElementById("view-all-members-btn").addEventListener("click", () => {
    document.querySelector('[data-tab="members"]').click();
  });
}

// POPULATE RANK FILTER SELECT BOX
function populateRankFilterOptions() {
  const select = document.getElementById("filter-rank");
  select.innerHTML = '<option value="all">Visi rankai</option>';
  RANKS.forEach(rank => {
    const opt = document.createElement("option");
    opt.value = rank;
    opt.textContent = rank;
    select.appendChild(opt);
  });
}

// FILTERS, SEARCH & SORTING
function initFilters() {
  const searchInput = document.getElementById("member-search");
  const clearBtn = document.getElementById("search-clear-btn");
  const rankFilter = document.getElementById("filter-rank");
  const sortBy = document.getElementById("sort-by");

  const triggerSearch = () => {
    const query = searchInput.value.trim();
    clearBtn.style.display = query ? "block" : "none";
    renderMembersGrid();
  };

  searchInput.addEventListener("input", triggerSearch);
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearBtn.style.display = "none";
    renderMembersGrid();
  });

  rankFilter.addEventListener("change", renderMembersGrid);
  sortBy.addEventListener("change", renderMembersGrid);
}

// RENDERING THE MEMBERS GRID (txAdmin style)
function renderMembersGrid() {
  const grid = document.getElementById("members-grid");
  const searchVal = document.getElementById("member-search").value.toLowerCase().trim();
  const rankVal = document.getElementById("filter-rank").value;
  const sortVal = document.getElementById("sort-by").value;

  grid.innerHTML = "";

  // Filter members
  let filtered = members.filter(m => {
    const nicknameMatch = m.nickname.toLowerCase().includes(searchVal);
    const firstNameMatch = m.personalInfo?.firstName?.toLowerCase().includes(searchVal) || false;
    const lastNameMatch = m.personalInfo?.lastName?.toLowerCase().includes(searchVal) || false;
    const phoneMatch = m.personalInfo?.phone?.includes(searchVal) || false;
    const searchMatch = nicknameMatch || firstNameMatch || lastNameMatch || phoneMatch;

    const rankMatch = rankVal === "all" || m.rank === rankVal;

    return searchMatch && rankMatch;
  });

  // Sort members
  filtered.sort((a, b) => {
    if (sortVal === "id-asc") return a.id - b.id;
    if (sortVal === "id-desc") return b.id - a.id;
    if (sortVal === "nickname-asc") return a.nickname.localeCompare(b.nickname);
    if (sortVal === "nickname-desc") return b.nickname.localeCompare(a.nickname);
    return 0;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-results" style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">Narių pagal paieškos kriterijus nerasta.</div>`;
    return;
  }

  filtered.forEach(m => {
    const card = document.createElement("div");
    card.className = "player-card";
    card.setAttribute("data-member-id", m.id);
    
    if (selectedMemberId === m.id) {
      card.classList.add("selected");
    }

    // Calc total buyout value for the card secondary text
    const totalSpent = m.buyouts ? m.buyouts.reduce((sum, b) => sum + Number(b.price), 0) : 0;
    const formattedSpent = formatCurrency(totalSpent);

    card.innerHTML = `
      <div class="player-card-top">
        <div class="player-card-id-name">
          <span class="player-card-id">${m.id}</span>
          <span class="player-card-name" title="${m.nickname}">${m.nickname}</span>
        </div>
      </div>
      <div class="player-card-meta" style="font-size:11px; margin-top: auto; margin-bottom:0; display:flex; justify-content:space-between; width:100%;">
        <span>Tel: ${m.personalInfo?.phone || '-'}</span>
        <span style="color: var(--accent-color); font-weight:700;">${formattedSpent}</span>
      </div>
    `;

    card.addEventListener("click", () => {
      selectMember(m.id);
    });

    grid.appendChild(card);
  });
}

// SELECT A MEMBER & SHOW DETAILS
function selectMember(id) {
  selectedMemberId = id;
  
  // Highlight selected card
  document.querySelectorAll(".player-card").forEach(c => c.classList.remove("selected"));
  const selectedCard = document.querySelector(`.player-card[data-member-id="${id}"]`);
  if (selectedCard) {
    selectedCard.classList.add("selected");
  }

  const member = members.find(m => m.id === id);
  if (!member) {
    document.getElementById("details-placeholder").classList.remove("hidden");
    document.getElementById("details-content").classList.add("hidden");
    return;
  }

  // Show details panel
  document.getElementById("details-placeholder").classList.add("hidden");
  document.getElementById("details-content").classList.remove("hidden");

  // Block 1: Personal Info
  const initials = getInitials(member.nickname, member.personalInfo?.firstName, member.personalInfo?.lastName);
  document.getElementById("details-avatar").textContent = initials;
  document.getElementById("details-nickname").textContent = member.nickname;
  
  const rankBadge = document.getElementById("details-rank");
  rankBadge.textContent = member.rank;
  // Dynamic colors for rank badge if desired
  rankBadge.className = `player-badge rank-${member.rank.toLowerCase()}`;

  const firstName = member.personalInfo?.firstName || '';
  const lastName = member.personalInfo?.lastName || '';
  document.getElementById("details-fullname").textContent = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'Nenurodyta';
  
  document.getElementById("details-birthdate").textContent = member.personalInfo?.birthDate || 'Nenurodyta';
  document.getElementById("details-phone").textContent = member.personalInfo?.phone || 'Nenurodyta';

  // Block 2: Buyouts (Supirkimai)
  renderBuyouts(member);
}

// RENDER BUYOUTS TABLE FOR SELECTED MEMBER
function renderBuyouts(member) {
  const tbody = document.getElementById("buyouts-tbody");
  tbody.innerHTML = "";

  const buyouts = member.buyouts || [];
  let totalCost = 0;
  
  buyouts.forEach(b => {
    totalCost += Number(b.price);
  });

  document.getElementById("details-buyouts-total-cost").textContent = formatCurrency(totalCost);
  document.getElementById("details-buyouts-total-count").textContent = buyouts.length;

  if (buyouts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px 0;">Šiam nariui supirkimų dar neatlikta.</td></tr>`;
    return;
  }

  // Sort buyouts by date descending
  const sortedBuyouts = [...buyouts].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedBuyouts.forEach(b => {
    const tr = document.createElement("tr");
    const formattedPrice = formatCurrency(b.price);
    const unitPrice = b.quantity > 0 ? (b.price / b.quantity) : 0;
    const formattedUnit = formatCurrency(unitPrice);
    
    // Formatting date
    const dateFormatted = formatDate(b.date);

    tr.innerHTML = `
      <td class="text-bold">${b.item}</td>
      <td>${b.quantity}</td>
      <td>${formattedUnit}</td>
      <td class="text-green text-bold">${formattedPrice}</td>
      <td class="subtitle">${dateFormatted}</td>
      <td class="buyout-action-btns">
        <button class="btn btn-icon btn-sm btn-outline edit-buyout-item-btn" data-buyout-id="${b.id}" title="Redaguoti">
          <i data-lucide="edit-2" style="width:12px;height:12px;"></i>
        </button>
        <button class="btn btn-icon btn-sm btn-danger-outline delete-buyout-item-btn" data-buyout-id="${b.id}" title="Ištrinti">
          <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
        </button>
      </td>
    `;

    // Bind item buttons
    tr.querySelector(".edit-buyout-item-btn").addEventListener("click", () => {
      openBuyoutModal(b.id);
    });

    tr.querySelector(".delete-buyout-item-btn").addEventListener("click", () => {
      deleteBuyout(b.id);
    });

    tbody.appendChild(tr);
  });

  lucide.createIcons();
}

// DASHBOARD UPDATES
function updateDashboard() {
  document.getElementById("stat-total-members").textContent = members.length;

  let grandTotalSpent = 0;
  let allBuyouts = [];

  members.forEach(m => {
    if (m.buyouts) {
      m.buyouts.forEach(b => {
        grandTotalSpent += Number(b.price);
        allBuyouts.push({
          memberNickname: m.nickname,
          memberId: m.id,
          ...b
        });
      });
    }
  });

  document.getElementById("stat-total-spent").textContent = formatCurrency(grandTotalSpent);

  // Render recent buyouts table on dashboard
  const tbody = document.getElementById("recent-buyouts-tbody");
  tbody.innerHTML = "";

  // Sort all buyouts by date descending
  allBuyouts.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = allBuyouts.slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px 0;">Nėra jokių supirkimų įrašų.</td></tr>`;
    return;
  }

  recent.forEach(b => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => {
      document.querySelector('[data-tab="members"]').click();
      selectMember(b.memberId);
    });

    tr.innerHTML = `
      <td class="text-bold">${b.memberNickname}</td>
      <td>${b.item}</td>
      <td>${b.quantity}</td>
      <td class="text-green text-bold">${formatCurrency(b.price)}</td>
      <td class="subtitle">${formatDate(b.date)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ACTIONS AND MODALS
function initActions() {
  const memberModal = document.getElementById("member-modal");
  const buyoutModal = document.getElementById("buyout-modal");

  // Close modals clicking cross, cancel button, or backdrop
  document.querySelectorAll(".modal-close-btn, .modal-cancel-btn").forEach(el => {
    el.addEventListener("click", () => {
      memberModal.classList.remove("active");
      buyoutModal.classList.remove("active");
    });
  });

  window.addEventListener("click", (e) => {
    if (e.target === memberModal) memberModal.classList.remove("active");
    if (e.target === buyoutModal) buyoutModal.classList.remove("active");
  });

  // ADD MEMBER BUTTON
  document.getElementById("add-member-btn").addEventListener("click", () => {
    openMemberModal();
  });

  // MEMBER FORM SUBMIT
  document.getElementById("member-form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveMemberForm();
  });

  // EDIT MEMBER DETAILS BUTTON
  document.getElementById("edit-member-info-btn").addEventListener("click", () => {
    if (selectedMemberId) {
      openMemberModal(selectedMemberId);
    }
  });

  // DELETE MEMBER BUTTON
  document.getElementById("delete-member-btn").addEventListener("click", () => {
    if (selectedMemberId) {
      if (confirm("Ar tikrai norite pašalinti šį narį ir visą jo supirkimų istoriją iš kartelio sąrašų?")) {
        deleteMember(selectedMemberId);
      }
    }
  });

  // ADD BUYOUT BUTTON
  document.getElementById("add-buyout-btn").addEventListener("click", () => {
    if (selectedMemberId) {
      openBuyoutModal();
    }
  });

  // BUYOUT FORM SUBMIT
  document.getElementById("buyout-form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveBuyoutForm();
  });

  // SETTINGS: GITHUB FORM
  document.getElementById("github-settings-form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveGitHubSettingsForm();
  });

  // SETTINGS: GITHUB TEST CONNECTION
  document.getElementById("test-github-connection-btn").addEventListener("click", () => {
    testGitHubConnection();
  });

  // SETTINGS: MANUAL EXPORT JSON
  document.getElementById("export-json-btn").addEventListener("click", () => {
    exportToJSONFile();
  });

  // SETTINGS: MANUAL IMPORT JSON
  document.getElementById("import-json-file").addEventListener("change", (e) => {
    importFromJSONFile(e);
  });

  // SETTINGS: DANGER RESET
  document.getElementById("reset-local-storage-btn").addEventListener("click", () => {
    if (confirm("DĖMESIO! Tai ištrins visus vietinius pakeitimus naršyklėje ir atstatys pavyzdinę duomenų bazę. Ar norite tęsti?")) {
      localStorage.removeItem("torpedos_members");
      loadDatabase().then(() => {
        selectedMemberId = null;
        renderMembersGrid();
        document.getElementById("details-placeholder").classList.remove("hidden");
        document.getElementById("details-content").classList.add("hidden");
        updateDashboard();
      });
    }
  });

  // DASHBOARD SYNC BUTTON
  document.getElementById("dashboard-sync-btn").addEventListener("click", () => {
    syncWithGitHub();
  });
}

// OPEN MEMBER MODAL (Add / Edit)
function openMemberModal(id = null) {
  const modal = document.getElementById("member-modal");
  const form = document.getElementById("member-form");
  const title = document.getElementById("member-modal-title");

  form.reset();

  if (id) {
    title.textContent = "Redaguoti nario asmeninius duomenis";
    const member = members.find(m => m.id === id);
    if (member) {
      document.getElementById("member-form-id").value = member.id;
      document.getElementById("member-form-nickname").value = member.nickname;
      document.getElementById("member-form-firstname").value = member.personalInfo?.firstName || "";
      document.getElementById("member-form-lastname").value = member.personalInfo?.lastName || "";
      document.getElementById("member-form-birthdate").value = member.personalInfo?.birthDate || "";
      document.getElementById("member-form-phone").value = member.personalInfo?.phone || "";
      document.getElementById("member-form-rank").value = member.rank;
    }
  } else {
    title.textContent = "Pridėti naują narį";
    document.getElementById("member-form-id").value = "";
  }

  modal.classList.add("active");
}

// SAVE MEMBER FORM (Create / Edit)
function saveMemberForm() {
  const modal = document.getElementById("member-modal");
  const idVal = document.getElementById("member-form-id").value;
  const nickname = document.getElementById("member-form-nickname").value.trim();
  const firstName = document.getElementById("member-form-firstname").value.trim();
  const lastName = document.getElementById("member-form-lastname").value.trim();
  const birthDate = document.getElementById("member-form-birthdate").value;
  const phone = document.getElementById("member-form-phone").value.trim();
  const rank = document.getElementById("member-form-rank").value;

  if (idVal) {
    // Edit existing member
    const id = parseInt(idVal);
    const index = members.findIndex(m => m.id === id);
    if (index !== -1) {
      members[index].nickname = nickname;
      members[index].rank = rank;
      members[index].online = false;
      members[index].statusColor = "red";
      members[index].personalInfo = {
        firstName,
        lastName,
        birthDate,
        phone
      };
      saveToLocalStorage();
      showToast(`Atnaujinti nario "${nickname}" duomenys.`, "success");
      
      // Auto-trigger sync if github credentials are configured
      autoSyncIfConfigured();

      // Refresh UI
      renderMembersGrid();
      if (selectedMemberId === id) {
        selectMember(id);
      }
    }
  } else {
    // Create new member
    const nextId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
    const newMember = {
      id: nextId,
      nickname,
      rank,
      online: false,
      statusColor: "red",
      personalInfo: {
        firstName,
        lastName,
        birthDate,
        phone
      },
      buyouts: []
    };
    members.push(newMember);
    saveToLocalStorage();
    showToast(`Sėkmingai pridėtas naujas narys "${nickname}"!`, "success");

    // Auto-trigger sync if github credentials are configured
    autoSyncIfConfigured();

    renderMembersGrid();
    selectMember(nextId);
  }

  modal.classList.remove("active");
  updateDashboard();
}

// DELETE MEMBER
function deleteMember(id) {
  const index = members.findIndex(m => m.id === id);
  if (index !== -1) {
    const nickname = members[index].nickname;
    members.splice(index, 1);
    saveToLocalStorage();
    showToast(`Narys "${nickname}" pašalintas iš sąrašo.`, "success");

    // Auto-trigger sync if github credentials are configured
    autoSyncIfConfigured();

    selectedMemberId = null;
    document.getElementById("details-placeholder").classList.remove("hidden");
    document.getElementById("details-content").classList.add("hidden");
    renderMembersGrid();
    updateDashboard();
  }
}

// OPEN BUYOUT MODAL (Add / Edit)
function openBuyoutModal(buyoutId = null) {
  const modal = document.getElementById("buyout-modal");
  const form = document.getElementById("buyout-form");
  const title = document.getElementById("buyout-modal-title");
  
  form.reset();

  // Set default datetime to local local time
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById("buyout-form-date").value = now.toISOString().slice(0, 16);

  if (buyoutId) {
    title.textContent = "Redaguoti supirkimą";
    const member = members.find(m => m.id === selectedMemberId);
    if (member && member.buyouts) {
      const buyout = member.buyouts.find(b => b.id === buyoutId);
      if (buyout) {
        document.getElementById("buyout-form-id").value = buyout.id;
        document.getElementById("buyout-form-item").value = buyout.item;
        document.getElementById("buyout-form-quantity").value = buyout.quantity;
        document.getElementById("buyout-form-price").value = buyout.price;
        
        // Convert to ISO local string slice(0,16) for datetime-local
        if (buyout.date) {
          try {
            // Replace spaces with 'T' if saved in simple format
            const cleanDate = buyout.date.replace(" ", "T");
            document.getElementById("buyout-form-date").value = cleanDate.slice(0, 16);
          } catch(e) {
            console.error("Format date error", e);
          }
        }
      }
    }
  } else {
    title.textContent = "Pridėti naują supirkimą";
    document.getElementById("buyout-form-id").value = "";
  }

  modal.classList.add("active");
}

// SAVE BUYOUT FORM (Create / Edit)
function saveBuyoutForm() {
  const modal = document.getElementById("buyout-modal");
  const buyoutIdVal = document.getElementById("buyout-form-id").value;
  const item = document.getElementById("buyout-form-item").value.trim();
  const quantity = parseInt(document.getElementById("buyout-form-quantity").value);
  const price = parseFloat(document.getElementById("buyout-form-price").value);
  const dateInput = document.getElementById("buyout-form-date").value; // Format: YYYY-MM-DDTHH:MM

  const memberIndex = members.findIndex(m => m.id === selectedMemberId);
  if (memberIndex === -1) return;

  const member = members[memberIndex];
  if (!member.buyouts) member.buyouts = [];

  // Replace 'T' with a space for a cleaner representation
  const dateStr = dateInput.replace("T", " ");

  if (buyoutIdVal) {
    // Edit existing buyout
    const bId = parseInt(buyoutIdVal);
    const bIndex = member.buyouts.findIndex(b => b.id === bId);
    if (bIndex !== -1) {
      member.buyouts[bIndex].item = item;
      member.buyouts[bIndex].quantity = quantity;
      member.buyouts[bIndex].price = price;
      member.buyouts[bIndex].date = dateStr;
      
      showToast("Supirkimo įrašas sėkmingai atnaujintas.", "success");
    }
  } else {
    // Create new buyout
    // Generate new unique ID across all buyouts to prevent conflicts
    let nextBId = 1001;
    members.forEach(m => {
      if (m.buyouts) {
        m.buyouts.forEach(b => {
          if (b.id >= nextBId) nextBId = b.id + 1;
        });
      }
    });

    const newBuyout = {
      id: nextBId,
      item,
      quantity,
      price,
      date: dateStr
    };
    
    member.buyouts.push(newBuyout);
    showToast(`Pridėtas supirkimas: ${item} x${quantity} už €${price.toLocaleString()}`, "success");
  }

  saveToLocalStorage();
  autoSyncIfConfigured();
  
  modal.classList.remove("active");
  
  // Refresh UI
  selectMember(selectedMemberId);
  updateDashboard();
}

// DELETE BUYOUT
function deleteBuyout(buyoutId) {
  if (confirm("Ar tikrai norite ištrinti šį supirkimo įrašą?")) {
    const memberIndex = members.findIndex(m => m.id === selectedMemberId);
    if (memberIndex !== -1) {
      const member = members[memberIndex];
      const bIndex = member.buyouts.findIndex(b => b.id === buyoutId);
      if (bIndex !== -1) {
        member.buyouts.splice(bIndex, 1);
        saveToLocalStorage();
        showToast("Supirkimo įrašas ištrintas.", "success");
        
        autoSyncIfConfigured();

        // Refresh UI
        selectMember(selectedMemberId);
        updateDashboard();
      }
    }
  }
}

// GITHUB SYNC LOGIC

// Load configuration
function loadGitHubSettings() {
  const saved = localStorage.getItem("torpedos_github_settings");
  if (saved) {
    try {
      gitHubSettings = JSON.parse(saved);
      // Pre-fill form
      document.getElementById("settings-github-token").value = gitHubSettings.token || '';
      document.getElementById("settings-github-repo").value = gitHubSettings.repo || '';
      document.getElementById("settings-github-branch").value = gitHubSettings.branch || 'main';
      document.getElementById("settings-github-path").value = gitHubSettings.path || 'Torpedos.json';
    } catch(e) {
      console.error("Klaida nuskaitant GitHub nustatymus:", e);
    }
  }
}

// Save configuration from form
function saveGitHubSettingsForm() {
  gitHubSettings.token = document.getElementById("settings-github-token").value.trim();
  gitHubSettings.repo = document.getElementById("settings-github-repo").value.trim();
  gitHubSettings.branch = document.getElementById("settings-github-branch").value.trim() || 'main';
  gitHubSettings.path = document.getElementById("settings-github-path").value.trim() || 'Torpedos.json';

  localStorage.setItem("torpedos_github_settings", JSON.stringify(gitHubSettings));
  showToast("GitHub nustatymai išsaugoti.", "success");
  
  updateSyncStatusOnDashboard();
}

// Update status text on Dashboard
function updateSyncStatusOnDashboard() {
  const indicator = document.getElementById("dashboard-sync-status");
  const btn = document.getElementById("dashboard-sync-btn");
  
  if (!gitHubSettings.token || !gitHubSettings.repo) {
    indicator.className = "sync-status-indicator warning";
    indicator.innerHTML = `<i data-lucide="alert-circle"></i> GitHub sinchronizacija nenustatyta (nustatykite skiltyje NUSTATYMAI)`;
    btn.disabled = true;
    btn.style.opacity = 0.5;
  } else {
    indicator.className = "sync-status-indicator success";
    indicator.innerHTML = `<i data-lucide="cloud-check"></i> Paruošta sinchronizavimui su ${gitHubSettings.repo}`;
    btn.disabled = false;
    btn.style.opacity = 1;
  }
  lucide.createIcons();
}

// Test GitHub Connection
async function testGitHubConnection() {
  const token = document.getElementById("settings-github-token").value.trim();
  const repo = document.getElementById("settings-github-repo").value.trim();
  const branch = document.getElementById("settings-github-branch").value.trim() || 'main';
  const path = document.getElementById("settings-github-path").value.trim() || 'Torpedos.json';

  if (!token || !repo) {
    showToast("Reikia įvesti GitHub Token ir Repozitoriją!", "error");
    return;
  }

  showToast("Bandoma prisijungti prie GitHub...", "info");

  try {
    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (response.ok) {
      showToast("Ryšys sėkmingas! Failas rastas repozitorijoje.", "success");
    } else if (response.status === 404) {
      showToast("Prisijungta sėkmingai, bet failas '" + path + "' šioje šakoje nerastas. Pirmasis sinchronizavimas jį sukurs.", "warning");
    } else {
      const err = await response.json();
      showToast(`Klaida jungiantis: ${err.message || response.statusText}`, "error");
    }
  } catch(e) {
    showToast("Ryšio klaida. Patikrinkite interneto ryšį.", "error");
    console.error(e);
  }
}

// Synchronize Database with GitHub (Commit & Push)
async function syncWithGitHub() {
  if (!gitHubSettings.token || !gitHubSettings.repo) {
    showToast("Suveskite GitHub nustatymus, kad galėtumėte sinchronizuoti.", "error");
    return;
  }

  const indicator = document.getElementById("dashboard-sync-status");
  indicator.className = "sync-status-indicator warning";
  indicator.innerHTML = `<i data-lucide="refresh-cw" class="spin"></i> Siunčiama į GitHub...`;
  lucide.createIcons();

  try {
    const url = `https://api.github.com/repos/${gitHubSettings.repo}/contents/${gitHubSettings.path}`;
    
    // Step 1: Fetch current file to get SHA (needed for updates)
    let sha = null;
    try {
      const getRes = await fetch(`${url}?ref=${gitHubSettings.branch}`, {
        method: "GET",
        headers: {
          "Authorization": `token ${gitHubSettings.token}`,
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }
    } catch(err) {
      console.log("Nepavyko gauti failo SHA (galbūt failas dar neegzistuoja).", err);
    }

    // Step 2: Prepare commit
    const contentText = JSON.stringify(members, null, 2);
    // Use UTF-8 base64 encoding (btoa might break on non-ascii letters, so we use encodeURIComponent + escape trick)
    const base64Content = btoa(unescape(encodeURIComponent(contentText)));

    const body = {
      message: `Atnaujinti kartelio nariai per Torpedos panelę (laikas: ${new Date().toLocaleString('lt-LT')})`,
      content: base64Content,
      branch: gitHubSettings.branch
    };

    if (sha) {
      body.sha = sha;
    }

    // Step 3: PUT request to save content
    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `token ${gitHubSettings.token}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify(body)
    });

    if (putRes.ok) {
      showToast("Sinchronizacija su GitHub sėkminga! Duomenys įrašyti.", "success");
      indicator.className = "sync-status-indicator success";
      indicator.innerHTML = `<i data-lucide="cloud-check"></i> Sėkmingai sinchronizuota su GitHub`;
    } else {
      const err = await putRes.json();
      showToast(`Sinchronizacijos klaida: ${err.message}`, "error");
      updateSyncStatusOnDashboard();
    }
  } catch(e) {
    showToast("Įvyko sistemos klaida sinchronizuojant.", "error");
    console.error(e);
    updateSyncStatusOnDashboard();
  }
  lucide.createIcons();
}

// Auto-sync if credentials are saved
function autoSyncIfConfigured() {
  if (gitHubSettings.token && gitHubSettings.repo) {
    syncWithGitHub();
  }
}

// MANUAL EXPORT JSON FILE
function exportToJSONFile() {
  try {
    const dataStr = JSON.stringify(members, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = gitHubSettings.path || 'Torpedos.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast("Atsisiuntimas pradėtas.", "success");
  } catch(e) {
    showToast("Nepavyko eksportuoti duomenų.", "error");
    console.error(e);
  }
}

// MANUAL IMPORT JSON FILE
function importFromJSONFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      
      // Simple validation
      if (Array.isArray(parsed)) {
        members = parsed;
        saveToLocalStorage();
        showToast("Duomenys sėkmingai importuoti!", "success");
        
        // Refresh UI
        selectedMemberId = null;
        renderMembersGrid();
        document.getElementById("details-placeholder").classList.remove("hidden");
        document.getElementById("details-content").classList.add("hidden");
        updateDashboard();
        
        // Auto-sync if configured
        autoSyncIfConfigured();
      } else {
        showToast("Klaida: Failo formatas neteisingas (turi būti JSON masyvas).", "error");
      }
    } catch(err) {
      showToast("Nepavyko nuskaityti failo. Įsitikinkite, kad failas yra teisingas JSON.", "error");
      console.error(err);
    }
  };
  reader.readAsText(file);
  // Reset file input value to allow uploading same file again
  event.target.value = '';
}

// UTILITY FUNCTIONS

// Format currency
function formatCurrency(value) {
  return '€' + Number(value).toLocaleString('lt-LT');
}

// Format Date string
function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const isoDateString = dateString.includes(' ') && !dateString.includes('T') ? dateString.replace(' ', 'T') : dateString;
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return dateString; // return raw if parse fails
    return d.toLocaleString('lt-LT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

// Get user initials for avatar
function getInitials(nickname, firstName = '', lastName = '') {
  if (firstName && lastName) {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  }
  return nickname.substring(0, 2).toUpperCase();
}

// Toast Notification
function showToast(message, type = 'success') {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';
  if (type === 'info') iconName = 'info';
  if (type === 'warning') iconName = 'alert-circle';
  
  toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  lucide.createIcons(); // Initialize the icon in toast
  
  // Slide in
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);
  
  // Fade out and remove after 4 seconds
  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 4000);
}

let gold = 350;
let reputation = 100;
let storeOpen = false;
let storeMaxExhibitionSlots = 5;

// Datos del Artista (Nombre y Firma como Dibujo Base64)
let artistProfile = {
    name: "Ese",
    signatureDataUrl: null
};

let wowInventory = Array(100).fill(null);
let selectedInvSlot = null;
let activeItemModalIndex = null;
let mixingSourceIndex = null;
let isSelectingTargetForMix = false;

// Variables para el pad de firma en el panel de Artista
let signatureCanvas, signatureCtx;
let isDrawingSignature = false;

// Reloj y ciclo de tiempo del juego
let gameTimeMinutes = 480; // Inicia a las 08:00 AM
let isNightTime = false;
let visitorMultiplier = 1.0;
let gameTimeInterval = null;

// Lienzo chico infinito por defecto
wowInventory[0] = { type: 'lienzo', sub: 'chico', name: 'Lienzo Chico', icon: '📦', count: 1, infinite: true };
wowInventory[1] = { type: 'marco', sub: 'madera', name: 'Marco de Madera', icon: '🖼️', count: 1 };
wowInventory[2] = { type: 'tacho', name: 'Rojo Estándar', color: '#e74c3c', liters: 1, maxLiters: 1, proportions: { '#e74c3c': 100 } };

let shedPaintings = [];

let canvas, ctx;
let painting = false;
let currentTool = 'pincel';
let currentColor = '#000000';
let activeOffers = [];
let currentEvalIndex = null;
let evalTimerInterval = null;
let evalTimeLeft = 30;
let editingPaintingId = null;
let currentCanvasName = "Obra sin título";
let currentCanvasAuthor = "Ese";
let currentCanvasDesc = "";
let currentSizeLabel = "chico";
let storeVisitorLoop = null;

let galleryViewMode = 'grid';
let catalogCurrentIndex = 0;

// Variables para el control táctil del taller (Zoom y Pan con dos dedos)
let workshopScale = 1;
let workshopPosX = 0;
let workshopPosY = 0;
let initialTouchDist = null;
let initialTouchCenterX = 0;
let initialTouchCenterY = 0;
let isPanningOrZooming = false;
let lastTouchX = 0;
let lastTouchY = 0;

const clientPersonalities = [
    {
        name: "Solitario",
        descType: "busca obras sobrias, oscuras y de tonos profundos que transmitan introspección.",
        eval: (r, g, b, brightness, complexity) => brightness < 120 ? 8 + Math.random()*2 : 4 + Math.random()*3
    },
    {
        name: "Excéntrico",
        descType: "ama lo vanguardista, estridente y de colores muy vivos o contrastados.",
        eval: (r, g, b, brightness, complexity) => Math.abs(r - g) + Math.abs(g - b) > 100 ? 8.5 + Math.random()*1.5 : 5 + Math.random()*3
    },
    {
        name: "Alegre",
        descType: "adora los tonos luminosos, cálidos y vibrantes que transmitan energía positiva.",
        eval: (r, g, b, brightness, complexity) => brightness > 140 ? 8 + Math.random()*2 : 4 + Math.random()*3
    },
    {
        name: "Intelectual",
        descType: "analiza detalladamente las formas, la proporción y la complejidad técnica de la obra.",
        eval: (r, g, b, brightness, complexity) => Math.min(10, 5 + (complexity / 15) + Math.random() * 2)
    },
    {
        name: "Pragmático",
        descType: "busca arte decorativo sin vueltas, fijándose mucho en si el precio es razonable.",
        eval: (r, g, b, brightness, complexity) => 6 + Math.random() * 3
    }
];

const clientFirstNames = ["Carlos", "Valentina", "Mateo", "Sofía", "Lucía", "Alejandro", "Martina", "Joaquín", "Camila", "Franco", "Bianca", "Thiago"];

// SISTEMA DE LOG PROPIO Y MODAL PROPIO
function customLog(text) {
    const log = document.getElementById('event-log');
    if (!log) return;
    let hours = Math.floor(gameTimeMinutes / 60);
    let mins = gameTimeMinutes % 60;
    let timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    log.innerHTML += `<div>[${timeString}] ${text}</div>`;
    log.scrollTop = log.scrollHeight;
}

function showCustomModal(title, message, callback) {
    let modal = document.getElementById('custom-game-modal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-game-modal';
        modal.className = 'custom-modal-overlay';
        modal.innerHTML = `
            <div class="custom-modal-box">
                <h3 id="custom-modal-title" style="color: #ffd700; margin-top:0;"></h3>
                <p id="custom-modal-msg" style="font-size: 12px; color: #ddd; margin: 15px 0;"></p>
                <div id="custom-modal-buttons" style="display: flex; gap: 8px; justify-content: center;"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('custom-modal-title').innerText = title;
    document.getElementById('custom-modal-msg').innerText = message;
    let btnContainer = document.getElementById('custom-modal-buttons');
    btnContainer.innerHTML = `<button class="btn-nav" id="custom-modal-ok" style="background: #2e8b57;">Aceptar</button>`;
    
    modal.style.display = 'flex';
    document.getElementById('custom-modal-ok').onclick = () => {
        modal.style.display = 'none';
        if(callback) callback();
    };
}

function showCustomConfirm(title, message, onConfirm) {
    let modal = document.getElementById('custom-game-modal');
    if(!modal) {
        showCustomModal(title, message, onConfirm);
        return;
    }
    document.getElementById('custom-modal-title').innerText = title;
    document.getElementById('custom-modal-msg').innerText = message;
    let btnContainer = document.getElementById('custom-modal-buttons');
    btnContainer.innerHTML = `
        <button class="btn-nav" id="custom-modal-yes" style="background: #2e8b57;">Sí</button>
        <button class="btn-nav" id="custom-modal-no" style="background: #d93838;">Cancelar</button>
    `;
    modal.style.display = 'flex';
    document.getElementById('custom-modal-yes').onclick = () => {
        modal.style.display = 'none';
        if(onConfirm) onConfirm();
    };
    document.getElementById('custom-modal-no').onclick = () => {
        modal.style.display = 'none';
    };
}

function startGameClock() {
    if(gameTimeInterval) clearInterval(gameTimeInterval);
    gameTimeInterval = setInterval(() => {
        gameTimeMinutes += 10;
        if(gameTimeMinutes >= 1440) gameTimeMinutes = 0;

        let hours = Math.floor(gameTimeMinutes / 60);
        let mins = gameTimeMinutes % 60;
        let timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

        isNightTime = (hours >= 20 || hours < 6);

        if ((hours >= 11 && hours <= 13) || (hours >= 17 && hours <= 20)) {
            visitorMultiplier = 1.8;
        } else if (isNightTime) {
            visitorMultiplier = 0.2;
        } else {
            visitorMultiplier = 1.0;
        }

        const clockElem = document.getElementById('game-clock-val');
        if(clockElem) {
            clockElem.innerText = `${isNightTime ? '🌙' : '☀️'} ${timeString}`;
            clockElem.style.color = isNightTime ? '#a29bfe' : '#f1c40f';
        }
    }, 3000);
}

function requestSwitchScreen(screenId) {
    const activeScreen = document.querySelector('.screen.active');
    if(activeScreen && activeScreen.id === 'paint-canvas-screen' && screenId !== 'paint-canvas-screen') {
        autoSaveAndSendToShed();
    }
    switchScreen(screenId);
}

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.add('active');
    if(screenId === 'inventory-screen') renderWowInventory();
    if(screenId === 'shed-screen') renderShedUI();
    if(screenId === 'gallery-screen') renderExhibitionSlots();
    if(screenId === 'paint-canvas-screen') initWorkshopCanvasTransform();
    if(screenId === 'artist-screen') loadArtistProfileUI();
}

function switchShopTab(category, btnElem) {
    document.querySelectorAll('.shop-category-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    const targetSection = document.getElementById('shop-' + category);
    if (targetSection) targetSection.classList.add('active');
    if (btnElem) btnElem.classList.add('active');
}

function toggleStore() {
    storeOpen = !storeOpen;
    const btn = document.getElementById('store-toggle-btn');
    const storeStatusDesc = document.getElementById('store-status-desc');
    
    if(storeOpen) {
        if (btn) { btn.innerText = "Tienda Abierta"; btn.style.background = "#2e8b57"; }
        if (storeStatusDesc) storeStatusDesc.innerText = "Abierta: Recibiendo visitantes";
        customLog("🚪 Abriste la galería al público.");
        startVisitorFlow();
    } else {
        if (btn) { btn.innerText = "Tienda Cerrada"; btn.style.background = "#d93838"; }
        if (storeStatusDesc) storeStatusDesc.innerText = "Cerrada: No entran visitantes";
        
        if(storeVisitorLoop) clearInterval(storeVisitorLoop);

        if(activeOffers.length > 0) {
            reputation = Math.max(0, reputation - 12);
            const repVal = document.getElementById('reputation-val');
            if (repVal) repVal.innerText = reputation;
            customLog("⚠️ ¡Cerraste la galería de golpe y echaste a los clientes! Reputación -12%.");
            activeOffers = [];
            renderOffers();
            closeEvalModal();
        } else {
            customLog("🔒 Cerraste la galería ordenadamente.");
        }
    }
    renderExhibitionSlots();
}

function startVisitorFlow() {
    if(storeVisitorLoop) clearInterval(storeVisitorLoop);
    
    let checkVisitors = () => {
        if(!storeOpen) return;
        let exhibitedCount = shedPaintings.filter(p => p.status === "En Exhibición").length;
        if(exhibitedCount > 0 && activeOffers.length < 3) {
            receiveNewOffer();
        }
        let nextInterval = Math.max(4000, (25000 - (reputation * 180)) / visitorMultiplier);
        storeVisitorLoop = setTimeout(checkVisitors, nextInterval);
    };
    storeVisitorLoop = setTimeout(checkVisitors, 5000);
}

function setGalleryViewMode(mode) {
    galleryViewMode = mode;
    document.getElementById('view-mode-grid').classList.toggle('active', mode === 'grid');
    document.getElementById('view-mode-catalog').classList.toggle('active', mode === 'catalog');
    
    let exhibitedList = shedPaintings.filter(p => p.status === "En Exhibición");
    if (exhibitedList.length === 0) {
        document.getElementById('exhibition-slots-container').style.display = 'grid';
        document.getElementById('exhibition-catalog-container').style.display = 'none';
        return;
    }

    document.getElementById('exhibition-slots-container').style.display = (mode === 'grid') ? 'grid' : 'none';
    document.getElementById('exhibition-catalog-container').style.display = (mode === 'catalog') ? 'block' : 'none';

    renderExhibitionSlots();
}

function renderExhibitionSlots() {
    let exhibitedList = shedPaintings.filter(p => p.status === "En Exhibición");
    const catalogSwitchBtn = document.getElementById('view-mode-catalog');
    const catalogContainer = document.getElementById('exhibition-catalog-container');
    const gridContainer = document.getElementById('exhibition-slots-container');

    if (exhibitedList.length === 0) {
        if (catalogSwitchBtn) catalogSwitchBtn.style.display = 'none';
        if (catalogContainer) catalogContainer.style.display = 'none';
        if (gridContainer) gridContainer.style.display = 'grid';
        galleryViewMode = 'grid';
        document.getElementById('view-mode-grid').classList.add('active');
    } else {
        if (catalogSwitchBtn) catalogSwitchBtn.style.display = 'inline-block';
    }

    if (galleryViewMode === 'grid') {
        renderExhibitionGrid();
    } else {
        renderExhibitionCatalog();
    }
}

function renderExhibitionGrid() {
    const container = document.getElementById('exhibition-slots-container');
    if(!container) return;
    container.innerHTML = "";

    for(let i = 0; i < storeMaxExhibitionSlots; i++) {
        let p = shedPaintings.find(item => item.slotIndex === i && item.status === "En Exhibición");

        if(p) {
            let visitorStatusState = storeOpen ? "👤 Clientes observando lámina..." : "👤 Galería cerrada";
            let visitorTextColor = storeOpen ? "#2ecc71" : "#e74c3c";
            let frontOrBackImg = p.isFlipped ? p.backDataUrl : p.dataUrl;
            let viewLabel = p.isFlipped ? "🔄 Viendo Reverso (Certificado/Firma)" : "🖼️ Viendo Frente";

            let descriptionBox = p.description ? `<div style="font-size: 10px; color: #ddd; background: #151522; border: 1px solid #444; border-radius: 4px; padding: 4px; margin: 4px 0; text-align: left;">📜 <em>Leyenda:</em> "${p.description}"</div>` : '';

            container.innerHTML += `
                <div class="painting-slot">
                    <div style="font-weight: bold; font-size: 13px;">${p.name} <span style="color:#ffd700">by ${p.author || 'Ese'}</span></div>
                    <div style="font-size: 10px; color: #a29bfe; margin-top:2px;">${viewLabel}</div>
                    <div class="lamina-3d-container" onclick="togglePaintingFlip(${p.id})">
                        <img src="${frontOrBackImg}" alt="Obra 3D" style="width: 100%; height: 110px; object-fit: contain; border-radius: 4px; background: #fff; margin: 4px 0; border: 2px solid #444;">
                        <div class="lamina-badge-3d">🎲 3D / Girar</div>
                    </div>
                    ${descriptionBox}
                    <div style="font-size: 11px; color: #aaa;">Precio: 💵 ${p.price.toLocaleString()}</div>
                    <div style="font-size: 11px; color: ${visitorTextColor}; margin: 2px 0;">${visitorStatusState}</div>
                    <button class="btn-nav" style="background: #c0392b; font-size: 10px; padding: 3px 6px; margin-top:4px;" onclick="retirarCuadro(${p.id})">Retirar al Galpón</button>
                </div>
            `;
        } else {
            container.innerHTML += `
                <div class="painting-slot" style="border-style: solid; display: flex; flex-direction:column; align-items: center; justify-content: center; color: #777; font-size: 12px; cursor: pointer; min-height: 160px;" onclick="requestSwitchScreen('shed-screen')">
                    <span>+ Exponer Lámina 3D</span>
                    <span style="font-size: 9px; color: #555; margin-top: 4px;">Ranura #${i+1} vacía</span>
                </div>
            `;
        }
    }
}

function togglePaintingFlip(paintingId) {
    let p = shedPaintings.find(item => item.id === paintingId);
    if(p) {
        p.isFlipped = !p.isFlipped;
        renderExhibitionSlots();
    }
}

function renderExhibitionCatalog() {
    let exhibitedList = shedPaintings.filter(p => p.status === "En Exhibición");
    if (exhibitedList.length === 0) return;

    if (catalogCurrentIndex >= exhibitedList.length) catalogCurrentIndex = 0;
    let currentP = exhibitedList[catalogCurrentIndex];

    let visitorStatusState = storeOpen ? "👤 Clientes observando..." : "👤 Galería cerrada";
    let visitorTextColor = storeOpen ? "#2ecc71" : "#e74c3c";
    let catalogImgSource = currentP.isFlipped ? currentP.backDataUrl : currentP.dataUrl;

    document.getElementById('catalog-title').innerText = `${currentP.name} ${currentP.isFlipped ? '(Reverso)' : ''}`;
    document.getElementById('catalog-author').innerText = `by ${currentP.author || 'Ese'}`;
    document.getElementById('catalog-img').src = catalogImgSource;
    document.getElementById('catalog-price').innerText = `Precio: 💵 ${currentP.price.toLocaleString()}`;
    
    let descCat = document.getElementById('catalog-desc');
    if(descCat) {
        descCat.innerHTML = currentP.description ? `📜 <em>Leyenda:</em> "${currentP.description}"` : 'Sin leyenda registrada.';
    }

    let visitorElem = document.getElementById('catalog-visitor-state');
    visitorElem.innerText = visitorStatusState;
    visitorElem.style.color = visitorTextColor;

    document.getElementById('catalog-counter').innerText = `${catalogCurrentIndex + 1} / ${exhibitedList.length}`;
}

function catalogToggleFlip() {
    let exhibitedList = shedPaintings.filter(p => p.status === "En Exhibición");
    if (exhibitedList.length === 0) return;
    if (catalogCurrentIndex >= exhibitedList.length) catalogCurrentIndex = 0;
    let currentP = exhibitedList[catalogCurrentIndex];
    currentP.isFlipped = !currentP.isFlipped;
    renderExhibitionCatalog();
}

function changeCatalogSlide(direction) {
    let exhibitedList = shedPaintings.filter(p => p.status === "En Exhibición");
    if (exhibitedList.length <= 1) return;

    let viewContent = document.getElementById('catalog-view-content');
    viewContent.classList.add('fade-out');

    setTimeout(() => {
        catalogCurrentIndex += direction;
        if (catalogCurrentIndex < 0) catalogCurrentIndex = exhibitedList.length - 1;
        if (catalogCurrentIndex >= exhibitedList.length) catalogCurrentIndex = 0;

        renderExhibitionCatalog();
        viewContent.classList.remove('fade-out');
    }, 300);
}

function retirarCuadro(paintingId) {
    if(storeOpen) {
        customLog("⚠️ ¡La galería debe estar CERRADA para retirar o cambiar cuadros!");
        return;
    }
    let p = shedPaintings.find(item => item.id === paintingId);
    if(p) {
        p.status = "En Galpón";
        delete p.slotIndex;
        customLog("🏗️ Retiraste el cuadro de la exposición al Galpón.");
    }
    renderExhibitionSlots();
}

function renderShedUI() {
    const container = document.getElementById('shed-container');
    if(!container) return;
    if(shedPaintings.length === 0) {
        container.innerHTML = `<div style="color: #777; font-size: 13px; text-align: center; padding: 15px;">El galpón está vacío.</div>`;
        return;
    }
    container.innerHTML = "";
    shedPaintings.forEach((p, idx) => {
        let authorDisplay = p.author ? `<span style="color:#ffd700">by ${p.author}</span>` : '';
        let shortDesc = p.description ? `<br><span style="font-size:10px; color:#888;">"${p.description}"</span>` : '';
        container.innerHTML += `
            <div class="shed-item-card">
                <div>
                    <strong><input type="text" id="shed-name-${idx}" value="${p.name}" style="background: #151522; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 2px 4px; width: 100px;"></strong> ${authorDisplay} (${p.sizeName || 'Chico'})
                    ${shortDesc}
                    <br><span style="font-size: 10px; color: #aaa;">Valor real: 💵 ${(p.realValue || 150).toLocaleString()}</span>
                </div>
                <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                    <span style="font-size: 11px; color: #2ecc71;">💵 <input type="number" id="shed-price-${idx}" value="${p.price}" style="width: 60px; background: #151522; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 2px;"></span>
                    <button class="btn-nav" style="font-size: 10px; padding: 4px 6px;" onclick="updateShedPaintingInfo(${idx})">Guardar</button>
                    <button class="btn-nav" style="background: #4e4ee1; font-size: 10px; padding: 4px 6px;" onclick="viewPaintingPreview(${p.id})">👁️ Ver</button>
                    <button class="btn-nav" style="background: #b8860b; font-size: 10px; padding: 4px 6px;" onclick="editPaintingFromShed(${p.id})">✏️</button>
                    <button class="btn-nav" style="background: #c0392b; font-size: 10px; padding: 4px 6px;" onclick="deletePaintingFromShed(${p.id})">🗑️</button>
                    ${p.status !== "En Exhibición" ? `<button class="btn-nav" style="background: #2e8b57; font-size: 10px; padding: 4px 6px;" onclick="openExhibitSelector(${idx})">Exponer</button>` : `<span style="font-size: 10px; color: #f1c40f;">En Exhibición</span>`}
                </div>
            </div>
        `;
    });
}

function viewPaintingPreview(id) {
    let p = shedPaintings.find(item => item.id === id);
    if(!p) return;
    let modal = document.getElementById('custom-game-modal');
    if(!modal) {
        customLog(`👁️ Vista previa de "${p.name}" (Autor: ${p.author})`);
        return;
    }
    document.getElementById('custom-modal-title').innerText = `Vista Previa: ${p.name}`;
    document.getElementById('custom-modal-msg').innerHTML = `
        <div style="text-align:center;">
            <img src="${p.dataUrl}" style="max-width:100%; max-height:180px; border:2px solid #444; background:#fff; border-radius:4px; margin-bottom:6px;">
            <div style="font-size:11px; color:#ffd700;">by ${p.author}</div>
            <div style="font-size:11px; color:#ccc; font-style:italic;">"${p.description || 'Sin descripción'}"</div>
        </div>
    `;
    let btnContainer = document.getElementById('custom-modal-buttons');
    btnContainer.innerHTML = `<button class="btn-nav" id="custom-modal-ok" style="background: #2e8b57;">Cerrar</button>`;
    modal.style.display = 'flex';
    document.getElementById('custom-modal-ok').onclick = () => { modal.style.display = 'none'; };
}

function deletePaintingFromShed(id) {
    showCustomConfirm("Eliminar Obra", "¿Estás seguro de eliminar permanentemente esta obra?", () => {
        shedPaintings = shedPaintings.filter(p => p.id !== id);
        activeOffers = activeOffers.filter(o => o.paintingId !== id);
        renderOffers();
        customLog("🗑️ Borraste una obra del galpón.");
        renderShedUI();
        renderExhibitionSlots();
    });
}

function updateShedPaintingInfo(idx) {
    const nameInput = document.getElementById(`shed-name-${idx}`);
    const priceInput = document.getElementById(`shed-price-${idx}`);
    if(nameInput && priceInput) {
        let newName = nameInput.value.trim() || "Obra sin título";
        let newPrice = parseInt(priceInput.value) || 100;
        
        let currentAuthor = shedPaintings[idx].author || "Ese";
        let duplicate = shedPaintings.some((p, i) => i !== idx && p.name.toLowerCase() === newName.toLowerCase() && (p.author || "Ese").toLowerCase() === currentAuthor.toLowerCase());
        
        if(duplicate) {
            customLog(`⚠️ Ya tienes otra obra titulada "${newName}" registrada bajo el autor "${currentAuthor}".`);
            return;
        }

        shedPaintings[idx].name = newName;
        shedPaintings[idx].price = newPrice;
        customLog(`✏️ Actualizaste información de la obra a "${newName}" (💵 ${newPrice.toLocaleString()}).`);
        renderExhibitionSlots();
    }
}

function openExhibitSelector(shedIndex) {
    if(storeOpen) {
        customLog("⚠️ La galería debe estar CERRADA para exponer una obra.");
        return;
    }
    let freeSlot = -1;
    for(let i = 0; i < storeMaxExhibitionSlots; i++) {
        let occupied = shedPaintings.some(p => p.slotIndex === i && p.status === "En Exhibición");
        if(!occupied) { freeSlot = i; break; }
    }
    if(freeSlot === -1) {
        customLog(`⚠️ Todas tus ranuras de exhibición (${storeMaxExhibitionSlots}) están llenas.`);
        return;
    }
    shedPaintings[shedIndex].status = "En Exhibición";
    shedPaintings[shedIndex].slotIndex = freeSlot;
    customLog(`🏛️ Pusiste en exposición "${shedPaintings[shedIndex].name}" en ranura #${freeSlot + 1}.`);
    requestSwitchScreen('gallery-screen');
}

function getAvailableInventoryCount(subType) {
    if (subType === 'chico') return '∞';
    let count = 0;
    wowInventory.forEach(item => {
        if(item !== null && item.type === 'lienzo' && item.sub === subType) {
            count += (item.count || 1);
        }
    });
    return count;
}

function addItemToWowInventory(item) {
    for(let i = 0; i < wowInventory.length; i++) {
        if(wowInventory[i] === null) {
            wowInventory[i] = item;
            return true;
        }
    }
    customLog("⚠️ ¡Inventario lleno! No se pudo añadir el objeto.");
    return false;
}

function buyItem(category, type, price) {
    if(gold < price) { customLog("⚠️ Dinero insuficiente para realizar la compra."); return; }
    gold -= price;
    document.getElementById('gold-val').innerText = gold;
    let newItem = { type: category, sub: type, name: `Lienzo ${type}`, icon: category === 'lienzo' ? '📦' : '🖼️', count: 1 };
    if(category === 'marco') newItem.name = `Marco ${type}`;
    if(addItemToWowInventory(newItem)) customLog(`📦 Compraste ${newItem.name}.`);
}

function buyPaintCan(size, price, liters) {
    if(gold < price) { customLog("⚠️ Dinero insuficiente para comprar pintura."); return; }
    gold -= price;
    document.getElementById('gold-val').innerText = gold;
    let chosenColor = document.getElementById('picker-' + size).value;
    let newCan = { type: 'tacho', name: `Frasco ${size} (${liters}L)`, color: chosenColor, liters: liters, maxLiters: liters, cost: price, proportions: {} };
    newCan.proportions[chosenColor] = 100;
    if(addItemToWowInventory(newCan)) {
        customLog(`🎨 Compraste frasquito (${liters}L) con éxito.`);
    }
}

function renderWowInventory() {
    const container = document.getElementById('wow-inventory-container');
    if (!container) return;
    container.innerHTML = "";
    wowInventory.forEach((slot, index) => {
        let div = document.createElement('div');
        div.className = `inv-slot ${selectedInvSlot === index ? 'selected' : ''}`;
        div.onclick = () => handleInventorySlotClick(index);
        div.onmouseenter = (e) => showInventoryTooltip(e, slot);
        div.onmouseleave = hideInventoryTooltip;

        if(slot !== null) {
            if(slot.type === 'tacho') {
                let percent = Math.max(0, Math.round((slot.liters / slot.maxLiters) * 100));
                div.innerHTML = `
                    <div class="paint-bottle"><div class="paint-bottle-cap"></div><div class="paint-bottle-label">AD</div>
                    <div class="paint-bottle-liquid" style="background: ${slot.color}; height: ${percent}%;"></div></div>
                    <div class="inv-badge">${percent}%</div>`;
            } else {
                div.innerHTML = `<span>${slot.icon}</span>`;
                let badgeVal = slot.infinite ? '∞' : (slot.count && slot.count > 1 ? slot.count : '');
                if(badgeVal !== '') div.innerHTML += `<div class="inv-badge">${badgeVal}</div>`;
            }
        }
        container.appendChild(div);
    });
}

function showInventoryTooltip(e, slot) {
    if(!slot) return;
    const tooltip = document.getElementById('inv-tooltip');
    if(!tooltip) return;
    if(slot.type === 'tacho') {
        let propText = Object.entries(slot.proportions || {}).map(([col, pct]) => `${pct}% ${col}`).join(', ');
        tooltip.innerHTML = `<strong>${slot.name}</strong><br>Color: ${slot.color}<br>Proporciones: [${propText}]<br>Volumen: ${slot.liters}L / ${slot.maxLiters}L`;
    } else {
        tooltip.innerHTML = `<strong>${slot.name}</strong>`;
    }
    tooltip.style.display = 'block';
    tooltip.style.left = (e.pageX + 10) + 'px';
    tooltip.style.top = (e.pageY + 10) + 'px';
}

function hideInventoryTooltip() {
    const tooltip = document.getElementById('inv-tooltip');
    if(tooltip) tooltip.style.display = 'none';
}

function handleInventorySlotClick(index) {
    const statusText = document.getElementById('inv-status-action');
    let clickedItem = wowInventory[index];

    if(isSelectingTargetForMix) {
        if(index === mixingSourceIndex) { customLog("⚠️ No puedes mezclar el frasco consigo mismo."); return; }
        if(clickedItem === null || clickedItem.type !== 'tacho') { customLog("⚠️ Selecciona otro frasquito válido."); return; }
        executeColorMixing(mixingSourceIndex, index);
        isSelectingTargetForMix = false;
        mixingSourceIndex = null;
        return;
    }

    if(selectedInvSlot !== null) {
        let temp = wowInventory[selectedInvSlot];
        wowInventory[selectedInvSlot] = wowInventory[index];
        wowInventory[index] = temp;
        selectedInvSlot = null;
        statusText.innerText = `Espacio libre seleccionado.`;
        renderWowInventory();
        return;
    }

    if(clickedItem !== null) {
        openItemActionModal(index);
    } else {
        selectedInvSlot = index;
        statusText.innerText = `Espacio seleccionado para mover.`;
        renderWowInventory();
    }
}

function openItemActionModal(index) {
    activeItemModalIndex = index;
    let item = wowInventory[index];
    if(!item) return;

    document.getElementById('item-modal-title').innerText = item.name;
    
    let actionsHtml = `
        <button class="btn-nav" style="background: #4e4ee1; width: 100%;" onclick="startMoveFromModal()">Mover de lugar</button>
        <button class="btn-nav" style="background: #c0392b; width: 100%;" onclick="discardSelectedItem()">Descartar / Eliminar</button>
    `;

    if(item.type === 'tacho') {
        let missingLiters = Math.max(0, item.maxLiters - item.liters);
        let baseCost = item.cost || 30;
        let refillCost = Math.max(1, Math.round((missingLiters / item.maxLiters) * baseCost));
        
        let refillBtnHtml = "";
        if (missingLiters <= 0) {
            refillBtnHtml = `<button class="btn-nav" style="background: #555; width: 100%; opacity: 0.6; cursor: not-allowed;" onclick="customLog('⚠️ Esta botella ya está al 100% de su capacidad.')">Rellenar (Ya está llena)</button>`;
        } else {
            refillBtnHtml = `<button class="btn-nav" style="background: #2e8b57; width: 100%;" onclick="refillSelectedTachoFromModal()">Rellenar (💵 ${refillCost})</button>`;
        }

        actionsHtml = `
            <button class="btn-nav" style="background: #4e4ee1; width: 100%;" onclick="startMoveFromModal()">Mover de lugar</button>
            <button class="btn-nav" style="background: #b8860b; width: 100%;" onclick="openMixModalFromAction()">Mezclar color</button>
            ${refillBtnHtml}
            <button class="btn-nav" style="background: #c0392b; width: 100%;" onclick="discardSelectedItem()">Descartar / Eliminar</button>
        `;
    }

    document.getElementById('item-modal-actions').innerHTML = actionsHtml;
    document.getElementById('item-action-modal').style.display = 'flex';
}

function closeItemActionModal() {
    document.getElementById('item-action-modal').style.display = 'none';
}

function startMoveFromModal() {
    selectedInvSlot = activeItemModalIndex;
    closeItemActionModal();
    document.getElementById('inv-status-action').innerText = `Moviendo objeto. Haz clic en el espacio destino.`;
}

function discardSelectedItem() {
    showCustomConfirm("Descartar", "¿Estás seguro de descartar este objeto del inventario?", () => {
        wowInventory[activeItemModalIndex] = null;
        closeItemActionModal();
        renderWowInventory();
        customLog("🗑️ Objeto descartado del inventario.");
    });
}

function openMixModalFromAction() {
    let index = activeItemModalIndex;
    closeItemActionModal();
    mixingSourceIndex = index;
    isSelectingTargetForMix = true;
    document.getElementById('inv-status-action').innerText = `🎨 Haz clic en el segundo frasco en tu inventario para mezclar.`;
}

function executeColorMixing(idx1, idx2) {
    let f1 = wowInventory[idx1], f2 = wowInventory[idx2];
    let props1 = f1.proportions || { [f1.color]: 100 }, props2 = f2.proportions || { [f2.color]: 100 };
    let l1 = f1.liters, l2 = f2.liters, totalLiters = l1 + l2;
    let absolutePigments = {};
    for(let [col, pct] of Object.entries(props1)) absolutePigments[col] = (absolutePigments[col] || 0) + (l1 * (pct / 100));
    for(let [col, pct] of Object.entries(props2)) absolutePigments[col] = (absolutePigments[col] || 0) + (l2 * (pct / 100));
    let newProportions = {}, finalR = 0, finalG = 0, finalB = 0;
    for(let [col, amount] of Object.entries(absolutePigments)) {
        let percentage = (amount / totalLiters) * 100;
        newProportions[col] = parseFloat(percentage.toFixed(1));
        let [r, g, b] = hexToRgb(col);
        finalR += r * (percentage / 100); finalG += g * (percentage / 100); finalB += b * (percentage / 100);
    }
    let blendedHex = rgbToHex(finalR, finalG, finalB);
    let mixedBottle = { type: 'tacho', name: `Frasco Mezcla (${totalLiters}L)`, color: blendedHex, liters: totalLiters, maxLiters: totalLiters, cost: 40, proportions: newProportions };
    wowInventory[idx1] = null; wowInventory[idx2] = null;
    if(addItemToWowInventory(mixedBottle)) customLog(`🎨 Mezcla completada con éxito. Tono resultante: ${blendedHex}`);
    renderWowInventory();
}

function refillSelectedTachoFromModal() {
    let tacho = wowInventory[activeItemModalIndex];
    let missingLiters = tacho.maxLiters - tacho.liters;
    if(missingLiters <= 0) { 
        customLog("⚠️ El frasco ya está al 100% de su capacidad."); 
        return; 
    }
    let refillCost = Math.max(1, Math.round((missingLiters / tacho.maxLiters) * (tacho.cost || 30)));
    if(gold < refillCost) { customLog("⚠️ Dinero insuficiente para rellenar."); return; }
    gold -= refillCost; document.getElementById('gold-val').innerText = gold;
    tacho.liters = tacho.maxLiters;
    closeItemActionModal(); 
    renderWowInventory();
    customLog("💧 Frasco rellenado correctamente.");
}

function hexToRgb(hex) {
    let bigint = parseInt(hex.replace('#',''), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
}

function loadArtistProfileUI() {
    const nameInput = document.getElementById('artist-name-input');
    if (nameInput) nameInput.value = artistProfile.name;

    signatureCanvas = document.getElementById('signaturePadCanvas');
    if(signatureCanvas) {
        signatureCtx = signatureCanvas.getContext('2d');
        if(artistProfile.signatureDataUrl) {
            let img = new Image();
            img.onload = () => {
                signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
                signatureCtx.drawImage(img, 0, 0);
            };
            img.src = artistProfile.signatureDataUrl;
        } else {
            drawSignaturePlaceholder();
        }

        signatureCanvas.onmousedown = (e) => {
            isDrawingSignature = true;
            signatureCtx.beginPath();
            let rect = signatureCanvas.getBoundingClientRect();
            signatureCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        };
        signatureCanvas.onmousemove = (e) => {
            if(!isDrawingSignature) return;
            let rect = signatureCanvas.getBoundingClientRect();
            signatureCtx.lineWidth = 2;
            signatureCtx.lineCap = 'round';
            signatureCtx.strokeStyle = '#000000';
            signatureCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
            signatureCtx.stroke();
        };
        signatureCanvas.onmouseup = () => { 
            isDrawingSignature = false; 
            signatureCtx.beginPath();
        };
        signatureCanvas.onmouseleave = () => { 
            isDrawingSignature = false; 
            signatureCtx.beginPath();
        };

        signatureCanvas.ontouchstart = (e) => {
            if(e.touches.length === 1) {
                isDrawingSignature = true;
                signatureCtx.beginPath();
                let rect = signatureCanvas.getBoundingClientRect();
                signatureCtx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
                e.preventDefault();
            }
        };
        signatureCanvas.ontouchmove = (e) => {
            if(!isDrawingSignature || e.touches.length !== 1) return;
            let rect = signatureCanvas.getBoundingClientRect();
            signatureCtx.lineWidth = 2;
            signatureCtx.lineCap = 'round';
            signatureCtx.strokeStyle = '#000000';
            signatureCtx.lineTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
            signatureCtx.stroke();
            e.preventDefault();
        };
        signatureCanvas.ontouchend = () => { 
            isDrawingSignature = false; 
            signatureCtx.beginPath();
        };
    }
}

function drawSignaturePlaceholder() {
    signatureCtx.fillStyle = "#ffffff";
    signatureCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    signatureCtx.fillStyle = "#333333";
    signatureCtx.font = "12px sans-serif";
    signatureCtx.fillText("Dibuje su firma aqui", 45, 45);
}

function clearSignaturePad() {
    if(!signatureCtx || !signatureCanvas) return;
    artistProfile.signatureDataUrl = null;
    drawSignaturePlaceholder();
    customLog("✍️ Pad de firma limpiado.");
}

function saveArtistProfile() {
    const nameInput = document.getElementById('artist-name-input');
    if (nameInput) {
        artistProfile.name = nameInput.value.trim() || "Ese";
    }
    if (signatureCanvas) {
        artistProfile.signatureDataUrl = signatureCanvas.toDataURL("image/png");
    }
    customLog(`✍️ Perfil y firma del artista "${artistProfile.name}" guardados correctamente.`);
}

function openNewPaintingModal() {
    document.getElementById('count-chico').innerText = `Disponibles: Infinito`;
    document.getElementById('count-mediano').innerText = `Disponibles: ${getAvailableInventoryCount('mediano')}`;
    document.getElementById('count-grande').innerText = `Disponibles: ${getAvailableInventoryCount('grande')}`;
    
    document.getElementById('input-painting-author').value = artistProfile.name;
    document.getElementById('new-painting-modal').style.display = 'block';
}
function closeNewPaintingModal() { document.getElementById('new-painting-modal').style.display = 'none'; }

function startNewPainting(width, height, tipo) {
    if (tipo !== 'chico') {
        let foundIndex = wowInventory.findIndex(item => item !== null && item.type === 'lienzo' && item.sub === tipo);
        if(foundIndex === -1) { customLog(`⚠️ No tienes stock de lienzos ${tipo}.`); return; }
        if(!wowInventory[foundIndex].infinite) {
            if(wowInventory[foundIndex].count && wowInventory[foundIndex].count > 1) wowInventory[foundIndex].count--;
            else wowInventory[foundIndex] = null;
        }
    }
    
    let enteredName = document.getElementById('input-painting-name').value.trim() || "Paisaje tal";
    let enteredAuthor = document.getElementById('input-painting-author').value.trim() || artistProfile.name;
    let enteredDesc = document.getElementById('input-painting-desc').value.trim() || "";

    let duplicate = shedPaintings.some(p => p.name.toLowerCase() === enteredName.toLowerCase() && (p.author || artistProfile.name).toLowerCase() === enteredAuthor.toLowerCase());
    if (duplicate && editingPaintingId === null) {
        customLog(`⚠️ Ya existe una obra registrada con el nombre "${enteredName}" del autor "${enteredAuthor}".`);
        return;
    }

    currentCanvasName = enteredName;
    currentCanvasAuthor = enteredAuthor;
    currentCanvasDesc = enteredDesc;
    currentSizeLabel = tipo;
    editingPaintingId = null;
    closeNewPaintingModal();
    setupCanvasEnvironment(width, height, null);
}

function editPaintingFromShed(id) {
    let p = shedPaintings.find(item => item.id === id);
    if(!p) return;
    editingPaintingId = p.id; 
    currentCanvasName = p.name; 
    currentCanvasAuthor = p.author || artistProfile.name;
    currentCanvasDesc = p.description || "";
    currentSizeLabel = p.sizeName || 'chico';
    setupCanvasEnvironment(p.width, p.height, p.dataUrl);
}

function initWorkshopCanvasTransform() {
    workshopScale = 1;
    workshopPosX = 0;
    workshopPosY = 0;
    applyCanvasTransform();
}

function applyCanvasTransform() {
    const wrap = document.getElementById('canvas-viewport-wrapper');
    if(wrap) {
        wrap.style.transform = `translate(${workshopPosX}px, ${workshopPosY}px) scale(${workshopScale})`;
    }
}

function setupCanvasEnvironment(width, height, initialDataUrl) {
    switchScreen('paint-canvas-screen');
    document.getElementById('paint-title-label').innerText = `Lienzo: ${currentCanvasName} | Autor: ${currentCanvasAuthor}`;
    canvas = document.getElementById('paintCanvas');
    canvas.width = width; canvas.height = height;
    ctx = canvas.getContext('2d');
    if(initialDataUrl) {
        let img = new Image();
        img.onload = () => { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0); };
        img.src = initialDataUrl;
    } else {
        ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    
    initWorkshopCanvasTransform();

    canvas.onmousedown = (e) => { 
        if(e.button !== 0) return;
        painting = true; 
        draw(e); 
    };
    canvas.onmouseup = () => { painting = false; ctx.beginPath(); };
    canvas.onmousemove = draw;
    canvas.onmouseleave = () => { painting = false; ctx.beginPath(); };

    const containerWrap = document.getElementById('workshop-scroll-area');
    if(containerWrap) {
        containerWrap.ontouchstart = (e) => {
            if(e.touches.length === 1) {
                if(e.target === canvas) {
                    painting = true;
                    draw(e.touches[0]);
                } else {
                    isPanningOrZooming = true;
                    lastTouchX = e.touches[0].clientX;
                    lastTouchY = e.touches[0].clientY;
                }
            } else if(e.touches.length === 2) {
                painting = false;
                ctx.beginPath();
                isPanningOrZooming = true;
                initialTouchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                initialTouchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                initialTouchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            }
        };

        containerWrap.ontouchmove = (e) => {
            e.preventDefault();
            if(painting && e.touches.length === 1 && e.target === canvas) {
                draw(e.touches[0]);
            } else if(isPanningOrZooming) {
                if(e.touches.length === 1) {
                    let dx = e.touches[0].clientX - lastTouchX;
                    let dy = e.touches[0].clientY - lastTouchY;
                    workshopPosX += dx;
                    workshopPosY += dy;
                    lastTouchX = e.touches[0].clientX;
                    lastTouchY = e.touches[0].clientY;
                    applyCanvasTransform();
                } else if(e.touches.length === 2 && initialTouchDist) {
                    let currentDist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    let factor = currentDist / initialTouchDist;
                    let newScale = Math.max(0.5, Math.min(4.0, workshopScale * factor));
                    workshopScale = newScale;
                    initialTouchDist = currentDist;
                    applyCanvasTransform();
                }
            }
        };

        containerWrap.ontouchend = (e) => {
            if(e.touches.length === 0) {
                painting = false;
                isPanningOrZooming = false;
                initialTouchDist = null;
                ctx.beginPath();
            }
        };
    }

    updatePaletteUI();
}

function updatePaletteUI() {
    const palette = document.getElementById('dynamic-palette');
    if (!palette) return;
    palette.innerHTML = "";
    let paletteItems = [{ name: 'Negro Infinito', color: '#000000', infinite: true }];
    wowInventory.forEach(item => { if(item !== null && item.type === 'tacho') paletteItems.push(item); });
    paletteItems.forEach((tacho) => {
        let percent = tacho.infinite ? 100 : Math.max(0, Math.round((tacho.liters / tacho.maxLiters) * 100));
        let isActive = (currentColor === tacho.color);
        palette.innerHTML += `
            <div class="workshop-bottle-wrapper ${isActive ? 'active-color' : ''}" onclick="selectPaintColor('${tacho.color}')">
                <div class="paint-bottle"><div class="paint-bottle-cap"></div><div class="paint-bottle-label">AD</div>
                <div class="paint-bottle-liquid" style="background: ${tacho.color}; height: ${percent}%;"></div></div>
                <div style="font-size:9px; color:#aaa; margin-top:2px;">${tacho.infinite ? '∞' : percent + '%'}</div>
            </div>`;
    });
}

function selectPaintColor(colorHex) { currentColor = colorHex; updatePaletteUI(); }
function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
}

function draw(e) {
    if (!painting || !canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    let hasPaint = currentColor === '#000000';
    if(!hasPaint) {
        wowInventory.forEach(item => {
            if(item !== null && item.type === 'tacho' && item.color === currentColor && item.liters > 0) {
                hasPaint = true;
                item.liters = parseFloat((item.liters - 0.001).toFixed(3));
                if(item.liters <= 0) {
                    item.liters = 0;
                    for(let i=0; i<wowInventory.length; i++) if(wowInventory[i] === item) { wowInventory[i] = null; break; }
                    currentColor = '#000000';
                }
            }
        });
    }
    updatePaletteUI();
    if(!hasPaint) return;
    ctx.lineWidth = currentTool === 'lapiz' ? 2 : (currentTool === 'pincel' ? 8 : 15);
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentTool === 'difuminar' ? 'rgba(0,0,0,0.1)' : currentColor;
    ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
}

function generateBackSideCanvas(frontCanvas, authorName, paintingName) {
    let backCanvas = document.createElement('canvas');
    backCanvas.width = frontCanvas.width;
    backCanvas.height = frontCanvas.height;
    let bCtx = backCanvas.getContext('2d');

    bCtx.fillStyle = "#e4d0a5";
    bCtx.fillRect(0, 0, backCanvas.width, backCanvas.height);

    bCtx.strokeStyle = "#c8b07d";
    bCtx.lineWidth = 15;
    bCtx.strokeRect(10, 10, backCanvas.width - 20, backCanvas.height - 20);

    bCtx.fillStyle = "#2c2c2c";
    bCtx.font = "bold 15px Arial";
    bCtx.textAlign = "center";
    bCtx.fillText("--- CERTIFICADO DE AUTENTICIDAD ---", backCanvas.width / 2, backCanvas.height * 0.28);
    
    bCtx.font = "14px Arial";
    bCtx.fillText(`Obra: "${paintingName}"`, backCanvas.width / 2, backCanvas.height * 0.40);
    bCtx.fillText(`Artista: ${authorName}`, backCanvas.width / 2, backCanvas.height * 0.50);

    // Muestra la firma dibujada del artista o texto alternativo si no hay trazo registrado
    if(artistProfile.signatureDataUrl) {
        let sigImg = new Image();
        sigImg.onload = () => {
            bCtx.drawImage(sigImg, (backCanvas.width / 2) - 60, backCanvas.height * 0.56, 120, 50);
        };
        sigImg.src = artistProfile.signatureDataUrl;
    } else {
        bCtx.font = "italic 16px serif";
        bCtx.fillStyle = "#1a0dab";
        bCtx.fillText(`Firma: ${artistProfile.name}`, backCanvas.width / 2, backCanvas.height * 0.63);
    }

    bCtx.font = "italic 10px Arial";
    bCtx.fillStyle = "#555";
    bCtx.fillText("Sello oficial registrado en el taller.", backCanvas.width / 2, backCanvas.height * 0.82);

    return backCanvas.toDataURL();
}

function analyzeCanvasData(paintingItem) {
    let tempCanvas = document.createElement('canvas');
    tempCanvas.width = paintingItem.width; tempCanvas.height = paintingItem.height;
    let tCtx = tempCanvas.getContext('2d');
    let img = new Image();
    img.src = paintingItem.dataUrl;
    
    tCtx.drawImage(img, 0, 0);
    let imgData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
    
    let rSum = 0, gSum = 0, bSum = 0, nonWhitePixels = 0, uniqueColors = {};
    let totalPixelsSampled = 0;

    for (let i = 0; i < imgData.length; i += 16) {
        let r = imgData[i], g = imgData[i+1], b = imgData[i+2];
        totalPixelsSampled++;
        
        if(!(r > 240 && g > 240 && b > 240)) {
            nonWhitePixels++;
            rSum += r; gSum += g; bSum += b;
            let colorKey = `${Math.round(r/25)}_${Math.round(g/25)}_${Math.round(b/25)}`;
            uniqueColors[colorKey] = true;
        }
    }

    let complexityRatio = nonWhitePixels / totalPixelsSampled;
    let colorVarietyCount = Object.keys(uniqueColors).length;
    
    let avgR = nonWhitePixels > 0 ? rSum / nonWhitePixels : 255;
    let avgG = nonWhitePixels > 0 ? gSum / nonWhitePixels : 255;
    let avgB = nonWhitePixels > 0 ? bSum / nonWhitePixels : 255;
    let brightness = (avgR * 0.299 + avgG * 0.587 + avgB * 0.114);

    let qualityMultiplier = 1.0;
    if (complexityRatio < 0.03 || colorVarietyCount < 2) {
        qualityMultiplier = 0.05;
    }

    let sizeMultiplier = paintingItem.sizeName === 'grande' ? 50 : (paintingItem.sizeName === 'mediano' ? 25 : 10);
    let realBaseValue = Math.round((50 + (complexityRatio * 500 * sizeMultiplier) + (colorVarietyCount * 120 * sizeMultiplier)) * qualityMultiplier);

    return { r: avgR, g: avgG, b: avgB, brightness: brightness, complexity: complexityRatio * 100, realValue: realBaseValue, isScribble: qualityMultiplier <= 0.05, colorsCount: colorVarietyCount };
}

function autoSaveAndSendToShed() {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const backDataUrl = generateBackSideCanvas(canvas, currentCanvasAuthor, currentCanvasName);

    let tempObj = { width: canvas.width, height: canvas.height, dataUrl: dataUrl, sizeName: currentSizeLabel };
    let analysis = analyzeCanvasData(tempObj);

    if (editingPaintingId !== null) {
        let existing = shedPaintings.find(p => p.id === editingPaintingId);
        if (existing) { 
            existing.name = currentCanvasName; 
            existing.author = currentCanvasAuthor;
            existing.description = currentCanvasDesc;
            existing.dataUrl = dataUrl; 
            existing.backDataUrl = backDataUrl;
            existing.width = canvas.width; 
            existing.height = canvas.height; 
            existing.sizeName = currentSizeLabel;
            existing.realValue = analysis.realValue;
            existing.price = Math.max(existing.price, Math.round(analysis.realValue * 0.8));
        }
    } else {
        let initialSuggestedPrice = Math.max(150, Math.round(analysis.realValue * 0.8));
        shedPaintings.push({ 
            id: Date.now(), 
            name: currentCanvasName, 
            author: currentCanvasAuthor,
            description: currentCanvasDesc,
            price: initialSuggestedPrice, 
            realValue: analysis.realValue,
            status: "En Galpón", 
            width: canvas.width, 
            height: canvas.height, 
            dataUrl: dataUrl, 
            backDataUrl: backDataUrl,
            sizeName: currentSizeLabel,
            isFlipped: false
        });
    }
    editingPaintingId = null;
}

function discardCanvasPermanently() { 
    showCustomConfirm("Eliminar", "¿Eliminar cuadro?", () => { 
        editingPaintingId = null; 
        switchScreen('shed-screen'); 
    }); 
}
function finishAndSendToShed() { autoSaveAndSendToShed(); switchScreen('shed-screen'); }

function receiveNewOffer() {
    let exhibitedList = shedPaintings.filter(p => p.status === "En Exhibición");
    if(!storeOpen || exhibitedList.length === 0) return;
    
    let randomExhibited = exhibitedList[Math.floor(Math.random() * exhibitedList.length)];
    let analysis = analyzeCanvasData(randomExhibited);
    randomExhibited.realValue = analysis.realValue;

    let randomClientName = clientFirstNames[Math.floor(Math.random() * clientFirstNames.length)];
    let randomPersonality = clientPersonalities[Math.floor(Math.random() * clientPersonalities.length)];

    let rawScore = randomPersonality.eval(analysis.r, analysis.g, analysis.b, analysis.brightness, analysis.complexity);
    if (analysis.isScribble) rawScore = 1.0;
    let finalScore = Math.min(10, Math.max(1, parseFloat(rawScore.toFixed(1))));

    let askPrice = randomExhibited.price;
    let priceRatio = askPrice / randomExhibited.realValue;

    let reviewText = "";
    let calculatedOfferPrice = 0;
    let isRejectedByPrice = false;

    if (analysis.isScribble) {
        isRejectedByPrice = true;
        reviewText = `¿Esto es un garabato? ¡Una falta de respeto total a la galería! ¡Me voy indignado!`;
        finalScore = 1.0;
    } else if(priceRatio > 3.5) {
        isRejectedByPrice = true;
        reviewText = `¡Estás pedido de más pidiendo 💵 ${askPrice.toLocaleString()} por esto! ¡Absurdo!`;
        finalScore = 1.0;
    } else if(priceRatio > 1.5) {
        reviewText = `Me gusta, pero pedir 💵 ${askPrice.toLocaleString()} es excesivo. Te ofrezco algo más justo.`;
        calculatedOfferPrice = Math.round(randomExhibited.realValue * (finalScore / 8));
    } else {
        let multiplier = (finalScore / 7.5);
        calculatedOfferPrice = Math.round(askPrice * multiplier);
        reviewText = `¡Me encanta! ${randomPersonality.descType} El precio me parece muy razonable.`;
    }

    calculatedOfferPrice = Math.max(10, calculatedOfferPrice);

    const newOffer = {
        id: Date.now(),
        obra: randomExhibited.name,
        cliente: `${randomClientName} (${randomPersonality.name})`,
        desc: reviewText,
        precio: isRejectedByPrice ? 0 : calculatedOfferPrice,
        score: finalScore,
        isRejected: isRejectedByPrice,
        time: 35,
        paintingId: randomExhibited.id
    };
    
    activeOffers.push(newOffer);
    renderOffers();
    customLog(`💬 Cliente ${newOffer.cliente} evaluó "${randomExhibited.name}".`);
}

function renderOffers() {
    const container = document.getElementById('offers-container');
    if (!container) return;
    if(activeOffers.length === 0) { container.innerHTML = "No hay ofertas activas."; return; }
    container.innerHTML = "";
    activeOffers.forEach((offer, idx) => {
        let statusText = offer.isRejected ? `<span style="color: #e74c3c; font-weight:bold;">¡Rechazado!</span>` : `Oferta: 💵 ${offer.precio.toLocaleString()} | ⭐ ${offer.score}`;
        container.innerHTML += `
            <div class="offer-card" onclick="openEvalModal(${idx})">
                <strong>${offer.cliente}</strong><br>
                <span style="color: #ffd700;">Obra: "${offer.obra}"</span><br>
                <span style="font-weight: bold;">${statusText}</span>
            </div>
        `;
    });
}

function openEvalModal(index) {
    currentEvalIndex = index;
    let offer = activeOffers[index];
    
    document.getElementById('modal-title').innerText = `Evaluación: "${offer.obra}"`;
    document.getElementById('modal-client-info').innerText = `Cliente: ${offer.cliente}`;
    document.getElementById('modal-desc').innerText = `"${offer.desc}"`;
    document.getElementById('modal-score').innerText = `⭐ Calificación: ${offer.score} / 10`;
    document.getElementById('modal-timer').innerText = offer.time;
    
    const priceContainer = document.getElementById('modal-price');
    const buttonsContainer = document.getElementById('modal-buttons-container');

    if(offer.isRejected) {
        priceContainer.innerHTML = `<span style="color: #e74c3c;">El cliente se fue indignado.</span>`;
        buttonsContainer.innerHTML = `<button class="btn-nav" style="background: #555; width: 100%;" onclick="closeEvalModal(); dismissRejectedOffer(${index});">Aceptar reclamo y cerrar</button>`;
    } else {
        priceContainer.innerHTML = `Propuesta de pago: 💵 ${offer.precio.toLocaleString()}`;
        buttonsContainer.innerHTML = `
            <button class="btn-nav" style="background: #2e8b57;" onclick="acceptActiveOffer()">Aceptar Venta</button>
            <button class="btn-nav" style="background: #d93838;" onclick="closeEvalModal()">Cerrar</button>
        `;
    }

    document.getElementById('eval-modal').style.display = 'flex';

    if(evalTimerInterval) clearInterval(evalTimerInterval);
    evalTimerInterval = setInterval(() => {
        offer.time--;
        document.getElementById('modal-timer').innerText = offer.time;
        if(offer.time <= 0) {
            clearInterval(evalTimerInterval);
            closeEvalModal();
            activeOffers.splice(currentEvalIndex, 1);
            renderOffers();
            reputation = Math.max(0, reputation - 3);
            document.getElementById('reputation-val').innerText = reputation;
            customLog("⚠️ Una oferta expiró. Reputación -3%.");
        }
    }, 1000);
}

function dismissRejectedOffer(index) {
    activeOffers.splice(index, 1);
    renderOffers();
    reputation = Math.max(0, reputation - 5);
    document.getElementById('reputation-val').innerText = reputation;
    customLog(`⚠️ Mala crítica recibida. Reputación -5%.`);
}

function closeEvalModal() {
    if(evalTimerInterval) clearInterval(evalTimerInterval);
    document.getElementById('eval-modal').style.display = 'none';
}

function acceptActiveOffer() {
    let offer = activeOffers[currentEvalIndex];
    gold += offer.precio;
    let repGain = offer.score >= 8 ? 3 : (offer.score >= 5 ? 1 : 0);
    reputation = Math.min(100, reputation + repGain);
    
    document.getElementById('gold-val').innerText = gold;
    document.getElementById('reputation-val').innerText = reputation;
    
    let soldPaintingId = offer.paintingId;
    shedPaintings = shedPaintings.filter(p => p.id !== soldPaintingId);
    activeOffers = activeOffers.filter(o => o.paintingId !== soldPaintingId);

    customLog(`💰 ¡Venta exitosa a ${offer.cliente}! Recibiste 💵 ${offer.precio.toLocaleString()}.`);
    
    closeEvalModal();
    renderOffers();
    renderExhibitionSlots();
}

window.addEventListener('DOMContentLoaded', () => {
    startGameClock();
    renderExhibitionSlots();
});
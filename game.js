// game.js
let gold = 350;
let reputation = 100;
let storeOpen = false;
let storeMaxExhibitionSlots = 5;

let artistProfile = {
    name: "Ese"
};

let wowInventory = Array(100).fill(null);
let selectedInvSlot = null;
let mixingSourceIndex = null;
let isSelectingTargetForMix = false;

let gameTimeMinutes = 480;
let isNightTime = false;
let visitorMultiplier = 1.0;
let gameTimeInterval = null;

// Tarro inicial de prueba en inventario (Negro infinito y Rojo estándar)
wowInventory[0] = { type: 'tacho', name: 'Negro Infinito', color: '#000000', liters: 999, maxLiters: 999, isInfinite: true, proportions: { '#000000': 100 } };
wowInventory[1] = { type: 'tacho', name: 'Rojo Estándar', color: '#e74c3c', liters: 1, maxLiters: 1, proportions: { '#e74c3c': 100 } };

let shedPaintings = [];

let canvas, ctx;
let painting = false;
let currentTool = 'pincel';
let currentColor = '#000000'; // Negro infinito por defecto
let activeOffers = [];
let currentEvalIndex = null;
let evalTimerInterval = null;
let editingPaintingId = null;
let currentCanvasName = "Obra sin título";
let currentCanvasAuthor = "Ese";
let currentCanvasDesc = "";
let currentSizeLabel = "chico";
let storeVisitorLoop = null;

let galleryViewMode = 'grid';
let catalogCurrentIndex = 0;

let workshopScale = 1;
let workshopPosX = 0;
let workshopPosY = 0;
let workshopRotation = 0; // Rotación actual en grados
let initialTouchDist = null;
let isPanningOrZooming = false;
let lastTouchX = 0;
let lastTouchY = 0;

let lastX = 0;
let lastY = 0;

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
                <div id="custom-modal-msg" style="font-size: 12px; color: #ddd; margin: 15px 0; text-align: left;"></div>
                <div id="custom-modal-buttons" style="display: flex; gap: 8px; justify-content: center;"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('custom-modal-title').innerText = title;
    
    let msgContainer = document.getElementById('custom-modal-msg');
    if (typeof message === 'string') {
        msgContainer.innerText = message;
    } else {
        msgContainer.innerHTML = "";
        msgContainer.appendChild(message);
    }

    let btnContainer = document.getElementById('custom-modal-buttons');
    btnContainer.innerHTML = `<button class="btn-nav" id="custom-modal-ok" style="background: #2e8b57; width: 100%;">Aceptar</button>`;
    
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
        <button class="btn-nav" id="custom-modal-yes" style="background: #2e8b57; flex: 1;">Sí</button>
        <button class="btn-nav" id="custom-modal-no" style="background: #d93838; flex: 1;">Cancelar</button>
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
        if(canvas) {
            autoSaveAndSendToShed();
            customLog("💾 Obra autoguardada al salir del taller.");
        }
    }
    switchScreen(screenId);
}

function autoSaveAndSendToShed() {
    if(!canvas) return;

    let trimmedName = currentCanvasName.trim();
    let nameConflict = shedPaintings.find(p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.id !== editingPaintingId);
    if(nameConflict) {
        trimmedName = trimmedName + " (" + Math.floor(Math.random()*100) + ")";
    }

    let dataUrl = canvas.toDataURL("image/png");
    let backDataUrl = generateBackDataUrl();
    let realValue = Math.round((canvas.width * canvas.height) / 500) + 120;
    let finalPrice = realValue;

    let existingIndex = -1;
    if (editingPaintingId !== null) {
        existingIndex = shedPaintings.findIndex(p => p.id === editingPaintingId);
    }

    if(existingIndex !== -1) {
        shedPaintings[existingIndex].name = trimmedName;
        shedPaintings[existingIndex].author = currentCanvasAuthor;
        shedPaintings[existingIndex].description = currentCanvasDesc;
        shedPaintings[existingIndex].dataUrl = dataUrl;
        shedPaintings[existingIndex].backDataUrl = backDataUrl;
        shedPaintings[existingIndex].width = canvas.width;
        shedPaintings[existingIndex].height = canvas.height;
    } else {
        let newPaintingObj = {
            id: Date.now(),
            name: trimmedName,
            author: currentCanvasAuthor,
            description: currentCanvasDesc,
            sizeName: currentSizeLabel,
            width: canvas.width,
            height: canvas.height,
            dataUrl: dataUrl,
            backDataUrl: backDataUrl,
            price: finalPrice,
            realValue: realValue,
            status: "En Galpón",
            isFlipped: false
        };
        shedPaintings.push(newPaintingObj);
        editingPaintingId = newPaintingObj.id;
    }
    return true;
}

function finishAndSendToShed() {
    autoSaveAndSendToShed();
    requestSwitchScreen('shed-screen');
}

function discardCanvasPermanently() {
    showCustomConfirm("Eliminar lienzo", "¿Seguro que deseas descartar esta obra sin guardar?", () => {
        editingPaintingId = null;
        customLog("🗑️ Lienzo descartado.");
        requestSwitchScreen('shed-screen');
    });
}

function generateBackDataUrl() {
    let tempC = document.createElement('canvas');
    tempC.width = 300; tempC.height = 225;
    let tCtx = tempC.getContext('2d');
    tCtx.fillStyle = "#f5f3ef";
    tCtx.fillRect(0, 0, tempC.width, tempC.height);

    tCtx.strokeStyle = "#dcd6cd";
    tCtx.lineWidth = 1;
    tCtx.strokeRect(10, 10, tempC.width - 20, tempC.height - 20);

    tCtx.fillStyle = "#2c2c2c";
    tCtx.font = "bold 14px Georgia";
    tCtx.fillText("CERTIFICADO DE AUTENTICIDAD", 30, 40);

    tCtx.font = "11px sans-serif";
    tCtx.fillText(`Obra: ${currentCanvasName}`, 30, 70);
    tCtx.fillText(`Autor: ${currentCanvasAuthor}`, 30, 90);
    tCtx.fillText(`Fecha: ${new Date().toLocaleDateString()}`, 30, 110);

    tCtx.fillStyle = "#2c3e50";
    tCtx.font = "italic bold 22px 'Brush Script MT', 'Lucida Handwriting', 'Segoe Script', cursive, serif";
    tCtx.fillText(artistProfile.name, 30, 155);

    return tempC.toDataURL("image/png");
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

function loadArtistProfileUI() {
    const nameInput = document.getElementById('artist-name-input');
    if(nameInput) {
        nameInput.value = artistProfile.name;
    }
}

function saveArtistProfile() {
    const nameInput = document.getElementById('artist-name-input');
    if(nameInput && nameInput.value.trim() !== "") {
        artistProfile.name = nameInput.value.trim();
        customLog(`✍️ Perfil de artista actualizado: ${artistProfile.name}`);
        showCustomModal("Perfil Guardado", "El nombre del artista y su firma cursiva se han actualizado correctamente.");
    }
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

function receiveNewOffer() {
    let exhibitedList = shedPaintings.filter(p => p.status === "En Exhibición");
    if(exhibitedList.length === 0) return;

    let targetPainting = exhibitedList[Math.floor(Math.random() * exhibitedList.length)];
    let personality = clientPersonalities[Math.floor(Math.random() * clientPersonalities.length)];
    let clientName = clientFirstNames[Math.floor(Math.random() * clientFirstNames.length)];

    let [r, g, b, brightness, complexity] = analyzePaintingImage(targetPainting.dataUrl);
    let score = personality.eval(r, g, b, brightness, complexity);
    score = Math.min(10, Math.max(2, parseFloat(score.toFixed(1))));

    let baseOfferPrice = Math.round(targetPainting.price * (score / 10));
    let offerObj = {
        id: Date.now() + Math.random(),
        paintingId: targetPainting.id,
        paintingName: targetPainting.name,
        clientName: clientName,
        personalityName: personality.name,
        personalityDesc: personality.descType,
        score: score,
        offerPrice: baseOfferPrice
    };

    activeOffers.push(offerObj);
    renderOffers();
    customLog(`💬 Nuevo visitante (${clientName} - ${personality.name}) está evaluando "${targetPainting.name}".`);
}

function analyzePaintingImage(dataUrl) {
    let img = new Image();
    img.src = dataUrl;
    let canvasAnalysis = document.createElement('canvas');
    canvasAnalysis.width = 50; canvasAnalysis.height = 50;
    let tCtx = canvasAnalysis.getContext('2d');
    tCtx.drawImage(img, 0, 0, 50, 50);
    let imgData = tCtx.getImageData(0, 0, 50, 50).data;

    let rSum = 0, gSum = 0, bSum = 0, diffSum = 0;
    let totalPixels = imgData.length / 4;

    for (let i = 0; i < imgData.length; i += 4) {
        let r = imgData[i], g = imgData[i+1], b = imgData[i+2];
        rSum += r; gSum += g; bSum += b;
        if(i > 4) {
            let prevR = imgData[i-4], prevG = imgData[i-3], prevB = imgData[i-2];
            diffSum += Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
        }
    }

    let rAvg = rSum / totalPixels;
    let gAvg = gSum / totalPixels;
    let bAvg = bSum / totalPixels;
    let brightness = (rAvg * 0.299 + gAvg * 0.587 + bAvg * 0.114);
    let complexity = diffSum / totalPixels;

    return [rAvg, gAvg, bAvg, brightness, complexity];
}

function renderOffers() {
    const container = document.getElementById('offers-container');
    if(!container) return;
    if(activeOffers.length === 0) {
        container.innerHTML = `No hay ofertas activas.`;
        return;
    }
    container.innerHTML = "";
    activeOffers.forEach((o, index) => {
        container.innerHTML += `
            <div class="offer-card" onclick="openEvalModal(${index})" style="background: #232336; padding: 6px; border-radius: 4px; margin-bottom: 4px; cursor: pointer; border: 1px solid #3d3d5c;">
                <strong>${o.clientName}</strong> (${o.personalityName})<br>
                Interesado en: <em>${o.paintingName}</em><br>
                <span style="color: #2ecc71; font-weight: bold;">Propuesta: 💵 ${o.offerPrice.toLocaleString()}</span>
            </div>
        `;
    });
}

function openEvalModal(index) {
    currentEvalIndex = index;
    let o = activeOffers[index];
    if(!o) return;

    document.getElementById('modal-title').innerText = `Oferta de ${o.clientName}`;
    document.getElementById('modal-client-info').innerText = `Perfil: ${o.personalityName}`;
    document.getElementById('modal-desc').innerText = `"${o.clientName} ${o.personalityDesc}"`;
    document.getElementById('modal-score').innerText = `⭐ Calificación del cliente: ${o.score} / 10`;
    document.getElementById('modal-price').innerText = `Propone pagar: 💵 ${o.offerPrice.toLocaleString()}`;

    let btnContainer = document.getElementById('modal-buttons-container');
    btnContainer.innerHTML = `
        <button class="btn-nav" style="background: #2e8b57; flex: 1;" onclick="acceptOffer(${index})">Aceptar Oferta</button>
        <button class="btn-nav" style="background: #c0392b; flex: 1;" onclick="rejectOffer(${index})">Rechazar</button>
    `;

    document.getElementById('eval-modal').style.display = 'flex';
    startEvalTimer(35);
}

function startEvalTimer(seconds) {
    if(evalTimerInterval) clearInterval(evalTimerInterval);
    let timeLeft = seconds;
    const timerElem = document.getElementById('modal-timer');
    if(timerElem) timerElem.innerText = timeLeft;

    evalTimerInterval = setInterval(() => {
        timeLeft--;
        if(timerElem) timerElem.innerText = timeLeft;
        if(timeLeft <= 0) {
            clearInterval(evalTimerInterval);
            closeEvalModal();
            if(currentEvalIndex !== null && activeOffers[currentEvalIndex]) {
                customLog(`⌛ Se acabó el tiempo para la oferta de ${activeOffers[currentEvalIndex].clientName}. Se fue aburrido.`);
                activeOffers.splice(currentEvalIndex, 1);
                renderOffers();
            }
        }
    }, 1000);
}

function closeEvalModal() {
    if(evalTimerInterval) clearInterval(evalTimerInterval);
    document.getElementById('eval-modal').style.display = 'none';
    currentEvalIndex = null;
}

function acceptOffer(index) {
    let o = activeOffers[index];
    if(!o) return;
    gold += o.offerPrice;
    document.getElementById('gold-val').innerText = gold;

    reputation = Math.min(100, reputation + 2);
    document.getElementById('reputation-val').innerText = reputation;

    let pIndex = shedPaintings.findIndex(item => item.id === o.paintingId);
    if(pIndex !== -1) {
        shedPaintings.splice(pIndex, 1);
    }

    customLog(`🤝 ¡Vendiste "${o.paintingName}" a ${o.clientName} por 💵 ${o.offerPrice.toLocaleString()}!`);
    activeOffers.splice(index, 1);
    closeEvalModal();
    renderOffers();
    renderExhibitionSlots();
    renderShedUI();
}

function rejectOffer(index) {
    let o = activeOffers[index];
    if(!o) return;
    customLog(`❌ Rechazaste la oferta de ${o.clientName}.`);
    activeOffers.splice(index, 1);
    closeEvalModal();
    renderOffers();
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
                    <div style="font-weight: bold; font-size: 13px;">${p.name} <span style="color:#ffd700">by ${p.author || artistProfile.name}</span></div>
                    <div style="font-size: 10px; color: #a29bfe; margin-top:2px;">${viewLabel}</div>
                    <div class="lamina-3d-container" onclick="togglePaintingFlip(${p.id})" style="cursor: pointer;">
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
    document.getElementById('catalog-author').innerText = `by ${currentP.author || artistProfile.name}`;
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
                    <strong><input type="text" id="shed-name-${idx}" value="${p.name}" style="background: #151522; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 2px 4px; width: 100px;"></strong> ${authorDisplay} (${p.sizeName || 'Chico'}) ${shortDesc}
                    <br><span style="font-size: 10px; color: #aaa;">Valor real: 💵 ${(p.realValue || 150).toLocaleString()}</span>
                </div>
                <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                    <span style="font-size: 11px; color: #2ecc71;">💵 <input type="number" id="shed-price-${idx}" value="${p.price}" style="width: 60px; background: #151522; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 2px;"></span>
                    <button class="btn-nav" style="font-size: 10px; padding: 4px 6px;" onclick="updateShedPaintingInfo(${idx})">Guardar</button>
                    <button class="btn-nav" style="background: #4e4ee1; font-size: 10px; padding: 4px 6px;" onclick="editPainting(${p.id})">🖌️ Editar</button>
                    <button class="btn-nav" style="background: #2e8b57; font-size: 10px; padding: 4px 6px;" onclick="openExposeModal(${p.id})">🏛️ Exponer</button>
                    <button class="btn-nav" style="background: #c0392b; font-size: 10px; padding: 4px 6px;" onclick="deleteShedPainting(${p.id})">🗑️</button>
                </div>
            </div>
        `;
    });
}

function updateShedPaintingInfo(idx) {
    let p = shedPaintings[idx];
    if(!p) return;
    let newNameInput = document.getElementById(`shed-name-${idx}`);
    let newPriceInput = document.getElementById(`shed-price-${idx}`);
    
    if(newNameInput && newNameInput.value.trim() !== "") {
        let newName = newNameInput.value.trim();
        let nameConflict = shedPaintings.find(item => item.name.toLowerCase() === newName.toLowerCase() && item.id !== p.id);
        
        if(nameConflict) {
            showCustomModal("Nombre duplicado", `Ya hay otra obra llamada "${newName}". No se pudo actualizar el nombre.`);
            newNameInput.value = p.name;
        } else {
            p.name = newName;
        }
    }
    
    if(newPriceInput) {
        let val = parseInt(newPriceInput.value);
        if(!isNaN(val) && val >= 0) {
            p.price = val;
        }
    }
    p.backDataUrl = generateBackDataUrl();
    customLog(`💾 Información de "${p.name}" actualizada.`);
    renderShedUI();
}

function deleteShedPainting(paintingId) {
    showCustomConfirm("Eliminar obra", "¿Seguro que deseas eliminar permanentemente esta obra del galpón?", () => {
        let idx = shedPaintings.findIndex(item => item.id === paintingId);
        if(idx !== -1) {
            shedPaintings.splice(idx, 1);
            customLog("🗑️ Obra eliminada del galpón.");
            renderShedUI();
            renderExhibitionSlots();
        }
    });
}

function openExposeModal(paintingId) {
    let p = shedPaintings.find(item => item.id === paintingId);
    if(!p) return;

    let availableSlots = [];
    for(let i = 0; i < storeMaxExhibitionSlots; i++) {
        let occupied = shedPaintings.some(item => item.slotIndex === i && item.status === "En Exhibición");
        if(!occupied) availableSlots.push(i);
    }

    if(availableSlots.length === 0) {
        showCustomModal("Sin espacio", "Todas las ranuras de exposición están ocupadas. Retira un cuadro primero.");
        return;
    }

    let slotOptionsHtml = availableSlots.map(s => `<option value="${s}">Ranura de Exhibición #${s+1}</option>`).join('');
    
    let modalContent = document.createElement('div');
    modalContent.innerHTML = `
        <div style="font-size: 11px; color: #ccc; margin-bottom: 8px;">Selecciona la ranura para exhibir <strong>${p.name}</strong>:</div>
        <select id="expose-slot-select" style="width: 100%; background: #151522; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 6px; box-sizing: border-box; margin-bottom: 12px;">
            ${slotOptionsHtml}
        </select>
        <button class="btn-nav" id="confirm-expose-btn" style="background: #2e8b57; width: 100%;">Confirmar Exposición</button>
    `;

    showCustomModal("Exponer Obra", modalContent, () => {
        let selectElem = document.getElementById('expose-slot-select');
        if(selectElem) {
            let chosenSlot = parseInt(selectElem.value);
            p.status = "En Exhibición";
            p.slotIndex = chosenSlot;
            p.isFlipped = false;
            customLog(`🏛️ Pusiste en exposición la obra "${p.name}" en la ranura #${chosenSlot + 1}.`);
            renderShedUI();
            renderExhibitionSlots();
        }
    });
}

function openNewPaintingModal() {
    let medCount = 0;
    let grCount = 0;
    wowInventory.forEach(item => {
        if(item !== null && item.type === 'lienzo') {
            if(item.size === 'mediano') medCount += (item.quantity || 1);
            if(item.size === 'grande') grCount += (item.quantity || 1);
        }
    });

    let selectElem = document.getElementById('input-painting-size');
    if(selectElem) {
        selectElem.innerHTML = `
            <option value="chico">Chico (Infinito - Base)</option>
            <option value="mediano">Mediano (450 x 300) [Disponibles: ${medCount}]</option>
            <option value="grande">Grande (600 x 400) [Disponibles: ${grCount}]</option>
        `;
    }

    document.getElementById('new-painting-modal').style.display = 'flex';
}

function closeNewPaintingModal() {
    document.getElementById('new-painting-modal').style.display = 'none';
}

function startNewCanvasFromModal() {
    let nameInput = document.getElementById('input-painting-name');
    let descInput = document.getElementById('input-painting-desc');
    let sizeSelect = document.getElementById('input-painting-size');

    let tentativeName = nameInput && nameInput.value.trim() !== "" ? nameInput.value.trim() : "Obra sin título";
    let sizeLabel = sizeSelect ? sizeSelect.value : "chico";

    if(sizeLabel !== 'chico') {
        let canvasIndex = wowInventory.findIndex(item => item !== null && item.type === 'lienzo' && item.size === sizeLabel);
        if(canvasIndex === -1) {
            showCustomModal("¡Lienzo requerido!", `No tienes ningún lienzo tamaño "${sizeLabel}" en tu inventario. ¡Compra uno en la tienda antes de empezar a pintar!`);
            return;
        }

        let lienzoItem = wowInventory[canvasIndex];
        if(lienzoItem.quantity && lienzoItem.quantity > 1) {
            lienzoItem.quantity -= 1;
        } else {
            wowInventory[canvasIndex] = null;
        }
        renderWowInventory();
        customLog(`🖼️ Has utilizado un lienzo (${sizeLabel}) de tu inventario.`);
    } else {
        customLog(`🖼️ Has utilizado el lienzo base infinito.`);
    }

    currentCanvasName = tentativeName;
    currentCanvasAuthor = artistProfile.name;
    currentCanvasDesc = descInput ? descInput.value.trim() : "";
    currentSizeLabel = sizeLabel;

    let w = 300, h = 200;
    if(currentSizeLabel === 'mediano') { w = 450; h = 300; }
    else if(currentSizeLabel === 'grande') { w = 600; h = 400; }

    editingPaintingId = null;
    closeNewPaintingModal();
    requestSwitchScreen('paint-canvas-screen');
    setupWorkshopCanvas(w, h);
}

function editPainting(paintingId) {
    let p = shedPaintings.find(item => item.id === paintingId);
    if(!p) return;

    currentCanvasName = p.name;
    currentCanvasAuthor = p.author || artistProfile.name;
    currentCanvasDesc = p.description || "";
    currentSizeLabel = p.sizeName || "chico";
    editingPaintingId = p.id;

    requestSwitchScreen('paint-canvas-screen');
    setupWorkshopCanvas(p.width, p.height, p.dataUrl);
}

function setupWorkshopCanvas(width, height, existingDataUrl = null) {
    canvas = document.getElementById('paintCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    document.getElementById('canvas-title-display').innerText = `${currentCanvasName} (${width}x${height})`;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    if(existingDataUrl) {
        let img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
        img.src = existingDataUrl;
    }

    initWorkshopCanvasEvents();
    updatePaletteUI();
}

function initWorkshopCanvasTransform() {
    const container = document.getElementById('canvas-container-mobile');
    if(!container) return;
    workshopScale = 1;
    workshopPosX = 0;
    workshopPosY = 0;
    workshopRotation = 0;
    applyCanvasTransform();
}

function applyCanvasTransform() {
    const container = document.getElementById('canvas-container-mobile');
    if(!container) return;
    container.style.transform = `translate(${workshopPosX}px, ${workshopPosY}px) scale(${workshopScale}) rotate(${workshopRotation}deg)`;
}

function zoomWorkshopCanvas(factor) {
    workshopScale = Math.min(4.0, Math.max(0.5, workshopScale * factor));
    applyCanvasTransform();
}

function rotateWorkshopCanvas(degrees) {
    workshopRotation = (workshopRotation + degrees) % 360;
    applyCanvasTransform();
    customLog(`🔄 Lienzo girado a ${workshopRotation}°`);
}

function resetWorkshopCanvasView() {
    workshopScale = 1;
    workshopPosX = 0;
    workshopPosY = 0;
    workshopRotation = 0;
    applyCanvasTransform();
}

function initWorkshopCanvasEvents() {
    const viewport = document.getElementById('canvas-viewport');
    if(!viewport) return;

    viewport.onmousedown = (e) => {
        if(e.button === 1 || e.shiftKey) {
            isPanningOrZooming = true;
            lastTouchX = e.clientX;
            lastTouchY = e.clientY;
            return;
        }
        startDrawing(e);
    };

    viewport.onmousemove = (e) => {
        if(isPanningOrZooming) {
            workshopPosX += e.clientX - lastTouchX;
            workshopPosY += e.clientY - lastTouchY;
            lastTouchX = e.clientX;
            lastTouchY = e.clientY;
            applyCanvasTransform();
            return;
        }
        draw(e);
    };

    viewport.onmouseup = (e) => {
        if(isPanningOrZooming) {
            isPanningOrZooming = false;
        }
        stopDrawing();
    };

    viewport.ontouchstart = (e) => {
        if(e.touches.length === 2) {
            isPanningOrZooming = true;
            initialTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            return;
        }
        if(e.touches.length === 1) {
            startDrawing(e.touches[0]);
        }
    };

    viewport.ontouchmove = (e) => {
        if(isPanningOrZooming && e.touches.length === 2) {
            let currentDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            let factor = currentDist / initialTouchDist;
            initialTouchDist = currentDist;
            workshopScale = Math.min(4.0, Math.max(0.5, workshopScale * factor));

            let midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            workshopPosX += midX - lastTouchX;
            workshopPosY += midY - lastTouchY;
            lastTouchX = midX;
            lastTouchY = midY;

            applyCanvasTransform();
            e.preventDefault();
            return;
        }
        if(e.touches.length === 1 && !isPanningOrZooming) {
            draw(e.touches[0]);
            e.preventDefault();
        }
    };

    viewport.ontouchend = (e) => {
        if(isPanningOrZooming) {
            isPanningOrZooming = false;
        }
        stopDrawing();
    };
}

function getCanvasCoords(e) {
    let rect = canvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    // Ajuste trigonométrico aproximado si el canvas está rotado para que el trazo responda bien
    let rad = (-workshopRotation * Math.PI) / 180;
    let cx = clientX - (rect.left + rect.width / 2);
    let cy = clientY - (rect.top + rect.height / 2);
    let rx = cx * Math.cos(rad) - cy * Math.sin(rad);
    let ry = cx * Math.sin(rad) + cy * Math.cos(rad);

    let x = (rx + rect.width / 2) * (canvas.width / rect.width);
    let y = (ry + rect.height / 2) * (canvas.height / rect.height);
    return { x, y };
}

function startDrawing(e) {
    painting = true;
    let coords = getCanvasCoords(e);
    lastX = coords.x;
    lastY = coords.y;
}

function draw(e) {
    if(!painting || !ctx) return;
    
    if(currentColor !== '#000000') {
        let activeTachoIndex = wowInventory.findIndex(item => item !== null && item.type === 'tacho' && item.color.toLowerCase() === currentColor.toLowerCase());
        if(activeTachoIndex !== -1) {
            let activeTacho = wowInventory[activeTachoIndex];
            if(activeTacho.liters <= 0) {
                customLog(`⚠️ ¡El tarro de ${activeTacho.name} se ha quedado sin tinta!`);
                return;
            }
            activeTacho.liters = Math.max(0, activeTacho.liters - 0.002);
            updatePaletteUI();
            renderWowInventory();
        }
    }

    let coords = getCanvasCoords(e);
    let x = coords.x;
    let y = coords.y;

    ctx.save();
    ctx.strokeStyle = (currentTool === 'borrador') ? '#ffffff' : currentColor;
    ctx.fillStyle = (currentTool === 'borrador') ? '#ffffff' : currentColor;

    if(currentTool === 'pincel') {
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if(currentTool === 'espatula') {
        ctx.lineWidth = 14;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if(currentTool === 'rodillo') {
        ctx.fillRect(x - 12, y - 12, 24, 24);
    } else if(currentTool === 'borrador') {
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    ctx.restore();
    lastX = x;
    lastY = y;
}

function stopDrawing() {
    painting = false;
}

function handleInventorySlotClick(index) {
    let clickedItem = wowInventory[index];

    if (isSelectingTargetForMix) {
        if (mixingSourceIndex === index) {
            customLog("⚠️ Seleccionaste el mismo tarro. Se cancela la mezcla.");
            isSelectingTargetForMix = false;
            mixingSourceIndex = null;
            renderWowInventory();
            return;
        }

        let sourceItem = wowInventory[mixingSourceIndex];
        if (clickedItem && clickedItem.type === 'tacho' && sourceItem && sourceItem.type === 'tacho') {
            if (sourceItem.color === clickedItem.color) {
                clickedItem.liters = Math.min(clickedItem.maxLiters, clickedItem.liters + sourceItem.liters);
                wowInventory[mixingSourceIndex] = null;
                customLog(`🎨 ¡Has mezclado y unificado los tarros de ${clickedItem.name}! Litros: ${clickedItem.liters.toFixed(1)}L`);
            } else {
                customLog("⚠️ No puedes mezclar tarros de colores distintos directamente.");
            }
        } else {
            customLog("⚠️ Debes seleccionar otro tarro de pintura válido.");
        }

        isSelectingTargetForMix = false;
        mixingSourceIndex = null;
        renderWowInventory();
        return;
    }

    selectedInvSlot = index;
    renderWowInventory();
}

// Botones de acción rápida para el inventario seleccionado
function inventoryActionRefill() {
    if (selectedInvSlot === null) {
        customLog("⚠️ Selecciona un tarro en el inventario primero.");
        return;
    }
    let item = wowInventory[selectedInvSlot];
    if (!item || item.type !== 'tacho' || item.isInfinite) {
        customLog("⚠️ Solo puedes recargar tarros de pintura normales.");
        return;
    }
    let missingLiters = Math.max(0, item.maxLiters - item.liters);
    let refillCost = Math.round(missingLiters * 35);
    
    if (gold < refillCost) {
        customLog("⚠️ No tienes suficiente oro para recargar este tarro.");
        return;
    }
    gold -= refillCost;
    document.getElementById('gold-val').innerText = gold;
    item.liters = item.maxLiters;
    customLog(`🔄 Recargaste ${item.name} al 100% por 💵 ${refillCost}.`);
    renderWowInventory();
    updatePaletteUI();
}

function inventoryActionMix() {
    if (selectedInvSlot === null) {
        customLog("⚠️ Selecciona un tarro primero.");
        return;
    }
    let item = wowInventory[selectedInvSlot];
    if (!item || item.type !== 'tacho') {
        customLog("⚠️ Selecciona un tarro de pintura para iniciar la mezcla.");
        return;
    }
    mixingSourceIndex = selectedInvSlot;
    isSelectingTargetForMix = true;
    customLog(`🎨 Haz clic en otro slot con un tarro del mismo color para sumar su contenido.`);
    renderWowInventory();
}

function inventoryActionDelete() {
    if (selectedInvSlot === null) {
        customLog("⚠️ Selecciona un objeto del inventario primero.");
        return;
    }
    let item = wowInventory[selectedInvSlot];
    if (item && item.isInfinite) {
        customLog("⚠️ No puedes eliminar el tarro negro infinito.");
        return;
    }
    wowInventory[selectedInvSlot] = null;
    customLog(`🗑️ Has descartado el objeto del inventario.`);
    selectedInvSlot = null;
    renderWowInventory();
    updatePaletteUI();
}

function renderShop() {
    const colorsGrid = document.getElementById('shop-colors-grid');
    if(colorsGrid) {
        colorsGrid.innerHTML = `
            <div class="shop-card">
                <div><strong>Tarro Azul</strong><br><span style="font-size: 10px; color: #888;">Color primario</span></div>
                <div style="font-size: 11px; color: #2ecc71; margin: 6px 0;">💵 50</div>
                <button class="btn-nav" onclick="buyColorItem('Tarro Azul', '#3498db', 50)">Comprar</button>
            </div>
            <div class="shop-card">
                <div><strong>Tarro Amarillo</strong><br><span style="font-size: 10px; color: #888;">Color primario</span></div>
                <div style="font-size: 11px; color: #2ecc71; margin: 6px 0;">💵 50</div>
                <button class="btn-nav" onclick="buyColorItem('Tarro Amarillo', '#f1c40f', 50)">Comprar</button>
            </div>
            <div class="shop-card">
                <div><strong>Tarro Rojo</strong><br><span style="font-size: 10px; color: #888;">Color primario</span></div>
                <div style="font-size: 11px; color: #2ecc71; margin: 6px 0;">💵 50</div>
                <button class="btn-nav" onclick="buyColorItem('Tarro Rojo', '#e74c3c', 50)">Comprar</button>
            </div>
            <div class="shop-card">
                <div><strong>Tarro Verde</strong><br><span style="font-size: 10px; color: #888;">Color secundario</span></div>
                <div style="font-size: 11px; color: #2ecc71; margin: 6px 0;">💵 60</div>
                <button class="btn-nav" onclick="buyColorItem('Tarro Verde', '#2ecc71', 60)">Comprar</button>
            </div>
            <div class="shop-card">
                <div><strong>Tarro Morado</strong><br><span style="font-size: 10px; color: #888;">Color secundario</span></div>
                <div style="font-size: 11px; color: #2ecc71; margin: 6px 0;">💵 60</div>
                <button class="btn-nav" onclick="buyColorItem('Tarro Morado', '#9b59b6', 60)">Comprar</button>
            </div>
        `;
    }

    const toolsGrid = document.getElementById('shop-tools-grid');
    if(toolsGrid) {
        toolsGrid.innerHTML = `
            <div class="shop-card">
                <div><strong>Lienzo Mediano</strong><br><span style="font-size: 10px; color: #888;">Formato mediano</span></div>
                <div style="font-size: 11px; color: #2ecc71; margin: 6px 0;">💵 60</div>
                <button class="btn-nav" onclick="buyCanvasItem('Lienzo Mediano', 'mediano', 60)">Comprar</button>
            </div>
            <div class="shop-card">
                <div><strong>Lienzo Grande</strong><br><span style="font-size: 10px; color: #888;">Formato grande</span></div>
                <div style="font-size: 11px; color: #2ecc71; margin: 6px 0;">💵 100</div>
                <button class="btn-nav" onclick="buyCanvasItem('Lienzo Grande', 'grande', 100)">Comprar</button>
            </div>
            <div class="shop-card">
                <div><strong>Espátula Pro</strong><br><span style="font-size: 10px; color: #888;">Herramienta</span></div>
                <div style="font-size: 11px; color: #2ecc71; margin: 6px 0;">💵 150</div>
                <button class="btn-nav" onclick="buyToolItem('Espátula Pro', 150)">Comprar</button>
            </div>
        `;
    }

    const expGrid = document.getElementById('shop-expansion-grid');
    if(expGrid) {
        expGrid.innerHTML = `
            <div class="shop-card">
                <div><strong>Ranura de Exhibición</strong><br><span style="font-size: 10px; color: #888;">Espacio en galería</span></div>
                <div style="font-size: 11px; color: #2ecc71; margin: 6px 0;">💵 300</div>
                <button class="btn-nav" onclick="buyExpansionSlot(300)">Comprar</button>
            </div>
        `;
    }
}

function buyColorItem(name, colorHex, cost) {
    if(gold < cost) {
        customLog("⚠️ No tienes suficiente oro.");
        return;
    }
    gold -= cost;
    document.getElementById('gold-val').innerText = gold;

    let emptyIndex = wowInventory.findIndex(slot => slot === null);
    if(emptyIndex !== -1) {
        wowInventory[emptyIndex] = {
            type: 'tacho',
            name: name,
            color: colorHex,
            liters: 1,
            maxLiters: 1,
            proportions: { [colorHex]: 100 }
        };
        customLog(`🛒 Compraste ${name} por 💵 ${cost} y se añadió al inventario.`);
    } else {
        customLog("⚠️ Tu inventario está lleno.");
    }
    renderWowInventory();
    updatePaletteUI();
}

function buyCanvasItem(name, sizeLabel, cost) {
    if(gold < cost) {
        customLog("⚠️ No tienes suficiente oro.");
        return;
    }
    gold -= cost;
    document.getElementById('gold-val').innerText = gold;

    let existingCanvas = wowInventory.find(item => item !== null && item.type === 'lienzo' && item.size === sizeLabel);
    if(existingCanvas) {
        existingCanvas.quantity = (existingCanvas.quantity || 1) + 1;
        customLog(`🛒 Compraste otro ${name} (Acumulado: ${existingCanvas.quantity}).`);
    } else {
        let emptyIndex = wowInventory.findIndex(slot => slot === null);
        if(emptyIndex !== -1) {
            wowInventory[emptyIndex] = {
                type: 'lienzo',
                name: name,
                size: sizeLabel,
                quantity: 1
            };
            customLog(`🛒 Compraste ${name} y se añadió al inventario.`);
        } else {
            customLog("⚠️ Tu inventario está lleno.");
        }
    }
    renderWowInventory();
}

function buyToolItem(name, cost) {
    if(gold < cost) {
        customLog("⚠️ No tienes suficiente oro.");
        return;
    }
    gold -= cost;
    document.getElementById('gold-val').innerText = gold;

    let emptyIndex = wowInventory.findIndex(slot => slot === null);
    if(emptyIndex !== -1) {
        wowInventory[emptyIndex] = {
            type: 'tool',
            name: name
        };
        customLog(`🛒 Compraste ${name}.`);
    }
    renderWowInventory();
}

function buyExpansionSlot(cost) {
    if(gold < cost) {
        customLog("⚠️ No tienes suficiente oro.");
        return;
    }
    if(storeMaxExhibitionSlots >= 10) {
        customLog("⚠️ Ya alcanzaste el máximo de ranuras posibles.");
        return;
    }
    gold -= cost;
    document.getElementById('gold-val').innerText = gold;
    storeMaxExhibitionSlots++;
    customLog(`📦 ¡Ampliaste tu galería! Ahora tienes ${storeMaxExhibitionSlots} ranuras de exhibición.`);
    renderExhibitionSlots();
}

function updatePaletteUI() {
    const palette = document.getElementById('workshop-palette-bar');
    if(!palette) return;
    
    palette.innerHTML = "";

    // Recolectar todos los tarros válidos del inventario
    let paletteItems = [];
    wowInventory.forEach(item => { 
        if(item !== null && item.type === 'tacho') {
            paletteItems.push(item); 
        }
    });
    
    paletteItems.forEach((tacho) => {
        let percent = tacho.isInfinite ? 100 : Math.max(0, Math.round((tacho.liters / tacho.maxLiters) * 100));
        let isActive = (currentColor.toLowerCase() === tacho.color.toLowerCase());
        
        palette.innerHTML += `
            <div class="workshop-bottle-wrapper ${isActive ? 'active-color' : ''}" onclick="selectColor('${tacho.color}')" title="${tacho.name} (${tacho.isInfinite ? 'Infinito' : tacho.liters.toFixed(1) + 'L'})">
                <div class="paint-bottle" style="width: 24px; height: 32px;">
                    <div class="paint-bottle-cap" style="width: 10px; height: 5px;"></div>
                    <div class="paint-bottle-liquid" style="background: ${tacho.color}; height: ${percent}%;"></div>
                </div>
                <span style="font-size: 9px; color: #fff;">${tacho.isInfinite ? 'INF' : percent + '%'}</span>
            </div>
        `;
    });
}

function selectColor(colorHex) {
    currentColor = colorHex;
    updatePaletteUI();
}

function setTool(toolName) {
    currentTool = toolName;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
}

function renderWowInventory() {
    const grid = document.getElementById('wow-inventory-grid');
    if(!grid) return;
    grid.innerHTML = "";

    for(let i = 0; i < 100; i++) {
        let item = wowInventory[i];
        let slotClass = `wow-inv-slot ${selectedInvSlot === i ? 'selected' : ''} ${isSelectingTargetForMix && mixingSourceIndex === i ? 'mixing-source' : ''}`;
        let content = "";
        let tooltipText = "Vacío";

        if(item) {
            if(item.type === 'tacho') {
                let percent = item.isInfinite ? 100 : Math.max(0, Math.round((item.liters / item.maxLiters) * 100));
                content = `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%;">
                        <div style="background:${item.color}; width:14px; height:14px; border-radius:50%; border:1px solid #fff;"></div>
                        <span style="font-size:8px; color:#fff; margin-top:2px;">${item.isInfinite ? 'INF' : percent + '%'}</span>
                    </div>
                `;
                tooltipText = `${item.name} (${item.isInfinite ? 'Infinito' : item.liters.toFixed(1) + 'L'})`;
            } else if(item.type === 'lienzo') {
                content = `🖼️<span style="font-size:8px; display:block;">${item.size || 'chico'}</span>`;
                tooltipText = `${item.name} (Cant: ${item.quantity || 1})`;
            } else if(item.type === 'tool') {
                content = `🛠️`;
                tooltipText = item.name;
            } else {
                content = `📦`;
                tooltipText = item.name;
            }
        }

        grid.innerHTML += `
            <div class="${slotClass}" onclick="handleInventorySlotClick(${i})" title="${tooltipText}">
                ${content}
            </div>
        `;
    }
}

window.onload = () => {
    startGameClock();
    renderShop();
    renderExhibitionSlots();
    renderShedUI();
    updatePaletteUI();
};


// --- CONFIG ARVGYM 3.0 ---
const APP_VERSION = "3.0.0";

const STORAGE_KEYS = {
    USERS: 'gym_users',
    PROFILES: 'gym_profile_',
    LOGS: 'gym_logs_'
};


const $ = (id) => document.getElementById(id);
let currentLang = 'en';

// --- INITIALIZATION ---
const initializeArvGym = () => {
    // registry in offline mode 
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Arv Gym Offline Ready!'))
                .catch(err => console.log('SW Registration failed', err));
        });
    }
    console.log(`System // ArvGym v${APP_VERSION} Booting...`);

    // 1. Athlete Management
    if ($("btn-user-add")) $("btn-user-add").onclick = handleAddUser;
    if ($("btn-user-purge")) $("btn-user-purge").onclick = deleteActiveProfile;
    if ($("user-selector")) $("user-selector").onchange = handleUserSwitch;

    // 2. Language & UI Actions
    if ($("btn-lang-en")) $("btn-lang-en").onclick = () => {
        changeLang('en');
        console.log('Btn change lang clicked :en');
    };
    if ($("btn-lang-pl")) $("btn-lang-pl").onclick = () => changeLang('pl');
    if ($("btn-save-workout")) $("btn-save-workout").onclick = saveWorkoutToLog;
    if ($("btn-edit-bio")) $("btn-edit-bio").onclick = updateAthleteProfile;
    if ($("btn-export")) $("btn-export").onclick = exportSystemBackup;

    // 3. Modal Controls
    const modal = $("history-modal");
    if ($("viewHistoryBtn")) $("viewHistoryBtn").onclick = () => { modal.style.display = "block"; renderFullHistory(); };
    if (modal) modal.querySelector("button").onclick = () => modal.style.display = "none";

    // 4. Boot Sequence
    injectVisualFeedback();
    renderUserSelector();
    const savedLang = localStorage.getItem('gym_last_lang') || 'en';
    changeLang(savedLang);

    const lastUser = localStorage.getItem('gym_last_session');  //new
    if (lastUser && $("user-selector")) {                       //New
        $("user-selector").value = lastUser;                        //New
        handleUserSwitch();
    } else {                                                    //New
        // if none in memory go as follow
        handleUserSwitch();
    }

    console.log("System // Boot sequence complete.");
};

// --- USER ENGINE ---
const handleUserSwitch = () => {
    const activeUser = $("user-selector").value;
    if (!activeUser) return;
    const userLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS + activeUser)) || [];
    syncBiometryUI();
    renderLog(userLogs);
    localStorage.setItem('gym_last_session', activeUser); //new in case to edit  <----- save new user
    console.log(`System // Context: ${activeUser}`);
};

const handleAddUser = () => {
    const msg = langData[currentLang].prompts.enterName;
    const name = prompt(msg);
    if (!name || name.trim() === "") return;
    let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || ["CezArv"];
    if (users.includes(name)) return alert("Athlete exists.");
    users.push(name.trim());
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    renderUserSelector();
    $("user-selector").value = name.trim();
    handleUserSwitch();
};

// --- BIOMETRICS ENGINE ---
function getBMIDetails(weight, height, bodyType) {
    if (!height || height === 0) return { value: 0, status: "N/A", color: "#aaa" };
    const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
    let status = "Normal", color = "#00ff88";
    const isAthletic = ["Athletic", "Muscular", "Atletyczny", "Muskularny"].includes(bodyType);

    if (bmi < 18.5) { status = "Underweight"; color = "#00f2ff"; }
    else if (bmi >= 25 && bmi < 30) { status = isAthletic ? "Fit/Form" : "Overweight"; color = isAthletic ? "#00ff88" : "#ffcc00"; }
    else if (bmi >= 30) { status = isAthletic ? "Athletic/Heavy" : "Obese"; color = isAthletic ? "#00ff88" : "#ff4444"; }

    const statusLabel = langData[currentLang].biometryStatus[status] || status;
    return { value: bmi, status: status, color: color };
}

function syncBiometryUI() {
    const activeUser = $("user-selector").value;
    if (!activeUser || typeof langData === 'undefined') return;
    const profileKey = STORAGE_KEYS.PROFILES + activeUser;
    const data = JSON.parse(localStorage.getItem(profileKey)) || { weight: 80, height: 180, bodyType: "Athletic" };
    const bmiData = getBMIDetails(data.weight, data.height, data.bodyType);

    if ($("bmi-value")) {
        $("bmi-value").innerText = bmiData.value;
        $("bmi-value").style.color = bmiData.color;
        $("bmi-value").innerHTML += ` <span style="font-size:0.5em; opacity:0.8; margin-left:5px;">(${bmiData.status})</span>`;
    }
    if ($("current-body-weight")) {
        const bType = data.bodyType || (currentLang === 'pl' ? "Nieokreślona" : "Not set");
        $("current-body-weight").innerHTML = `<span style="font-size:1.1em;">${data.weight}kg / ${data.height}cm</span><br><span style="color:#00f2ff; font-size:0.85em; font-weight:bold;">[ ${bType} ]</span>`;
    }
}

function updateAthleteProfile() {
    const isPl = currentLang === 'pl';
    const activeUser = $("user-selector").value;
    const profileKey = STORAGE_KEYS.PROFILES + activeUser;
    const current = JSON.parse(localStorage.getItem(profileKey)) || { weight: 80, height: 180, bodyType: "Athletic" };

    const w = parseFloat(prompt(isPl ? "Waga (kg):" : "Weight (kg):", current.weight));
    const h = parseFloat(prompt(isPl ? "Wzrost (cm):" : "Height (cm):", current.height));
    if (isNaN(w) || isNaN(h)) return;

    const typeChoice = prompt(isPl ? "1: Chudy, 2: Szczupły, 3: Atletyczny, 4: Muskularny, 5: Otyły" : "1: Ecto, 2: Lean, 3: Athletic, 4: Muscular, 5: Endo", "3");
    const typeMap = isPl ? { "1": "Chudy", "2": "Szczupły", "3": "Atletyczny", "4": "Muskularny", "5": "Otyły" } : { "1": "Ectomorph", "2": "Lean", "3": "Athletic", "4": "Muscular", "5": "Endomorph" };

    localStorage.setItem(profileKey, JSON.stringify({ weight: w, height: h, bodyType: typeMap[typeChoice] || current.bodyType }));
    syncBiometryUI();
}

// --- TRAINING LOGIC ---
function showLastResult(ex) {
    const infoBox = $("last-result-info");
    const activeUser = $("user-selector").value;
    if (!infoBox || !activeUser || !ex) return;

    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS + activeUser)) || [];
    const exHistory = history.filter(e => e.exercise === ex);
    const last = exHistory[0];

    let content = `<b style="color:#00f2ff">${ex}</b><br>`;
    if (last) {
        content += `⏱️ Last: ${last.weight}kg x ${last.reps} (RPE ${last.rpe})<br>`;
        const rpeVal = parseInt(last.rpe);
        let msg = rpeVal >= 12 ? "🔥 HOT! Stay here." : "🚀 Solid! Push it.";
        content += `<span style="font-weight:bold;">${msg}</span>`;
    }
    infoBox.innerHTML = content;
}

const saveWorkoutToLog = () => {
    const activeUser = $("user-selector").value;
    const ex = $("exercise-type").value;
    const w = $("weight-in").value;
    const r = $("reps-in").value;
    const rpe = $("rpe-select").value;

    if (!activeUser || !ex || !w || !r) return alert("Fill all fields!");

    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS + activeUser)) || [];
    //--- Number of series in an exercise (New)
    const today = new
        Date().toLocaleDateString();
    // how many same exercise from today
    const setNumber = logs.filter(l =>
        l.exercise === ex && l.date === today).length + 1;
    // save to log     
    logs.unshift({
        exercise: ex,
        weight: w,
        reps: r,
        rpe: rpe,
        date: today,
        set: setNumber // add set to database
    });
    localStorage.setItem(STORAGE_KEYS.LOGS + activeUser, JSON.stringify(logs));
    // Re 
    $("weight-in").value = '';
    $("reps-in").value = '';
    renderLog(logs);
    showLastResult(ex);
    startRestTimer();
};

function renderLog(history = []) {
    const list = $("workout-list");
    if (!list) return;

    // Zawsze pobieraj świeży pakiet językowy na starcie funkcji
    const lang = langData[currentLang];

    if (history.length === 0) {
        const activeUser = $("user-selector").value;
        history = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS + activeUser)) || [];
    }

    // Używamy słownika zamiast sztywnego pytania o 'pl'
    let html = `<h3 style="color:#00f2ff">${lang.ui.activityTitle}</h3><ul>`;

    history.slice(0, 5).forEach(i => {
        const translatedName = lang.exNames[i.exercise] || i.exercise;
        const setLabel = lang.ui.setLabel || 'Set'; // Słownik!
        const setDisplay = i.set ? `<span style="color:#ff00ff"> [${setLabel} ${i.set}]</span>` : '';

        html += `<li style="margin-bottom:5px;"><b>${translatedName}</b>${setDisplay}: ${i.weight}kg x ${i.reps} <small>(RPE ${i.rpe})</small></li>`;
    });

    list.innerHTML = html + "</ul>";
}



// --- TIMER & UI ---
let timerInterval;

function startRestTimer() {
    // 1. Pobieramy czas z selecta (np. 90, 180, 60)
    let timeLeft = parseInt($("training-goal").value) || 90;
    const display = $("timer-display");
    const timeSpan = $("time-left");

    // 2. Przygotowujemy UI (pokaż timer i zresetuj tekst)
    display.style.display = "block";
    display.innerHTML = `<span style="color:#aaa; font-size:0.8em;">RESTING...</span><br>
                         <span id="time-left" style="font-size:2.5em; color:#ffcc00; font-weight:bold;">${timeLeft}</span><span style="color:#ffcc00">s</span>`;

    // 3. Czyścimy stary interwał, żeby przyspieszony licznik nie "wariaował"
    clearInterval(timerInterval);

    // 4. Start odliczania
    timerInterval = setInterval(() => {
        timeLeft--;

        // Aktualizacja cyferek na ekranie
        if ($("time-left")) $("time-left").innerText = timeLeft;

        // 5. Co się dzieje, gdy czas minie?
        if (timeLeft <= 0) {
            clearInterval(timerInterval);

            // Dźwięk
            if ($("timer-sound")) $("timer-sound").play().catch(() => { });

            // Zmiana napisu na "GO!"
            display.innerHTML = "<b style='font-size:2em; color:#00ff88;'>🔥 GO! 🔥</b>";

            // 6. Czekamy 3 sekundy i chowamy baner (zamiast przeładowania strony)
            setTimeout(() => {
                display.style.display = "none";
                renderLog(); // Odświeżamy widok listy, żeby wszystko było aktualne
            }, 3000);
        }
    }, 1000);
}


const injectVisualFeedback = () => {
    const wIn = $("weight-in");
    if (wIn) wIn.oninput = () => wIn.style.boxShadow = wIn.value > 100 ? "0 0 10px #00f2ff" : "none";
};

// --- DATA MAINTENANCE ---
const exportSystemBackup = () => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || ["CezArv"];
    const backup = { users: JSON.stringify(users), profiles: {}, logs: {} };
    users.forEach(u => {
        backup.profiles[u] = localStorage.getItem(STORAGE_KEYS.PROFILES + u);
        backup.logs[u] = localStorage.getItem(STORAGE_KEYS.LOGS + u);
    });
    const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ArvGym_Backup.json`; a.click();
};

const importFullData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const backup = JSON.parse(e.target.result);
        localStorage.setItem(STORAGE_KEYS.USERS, backup.users);
        const users = JSON.parse(backup.users);
        users.forEach(u => {
            if (backup.profiles[u]) localStorage.setItem(STORAGE_KEYS.PROFILES + u, backup.profiles[u]);
            if (backup.logs[u]) localStorage.setItem(STORAGE_KEYS.LOGS + u, backup.logs[u]);
        });
        location.reload();
    };
    reader.readAsText(file);
};

function renderFullHistory() {
    const activeUser = $("user-selector").value;
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS + activeUser)) || [];
    let html = `<table style="width:100%; color:white;"><tr><th>Date</th><th>Ex</th><th>Kg</th><th>Reps</th></tr>`;
    history.forEach(i => { html += `<tr><td>${i.date}</td><td>${i.exercise}</td><td>${i.weight}</td><td>${i.reps}</td></tr>`; });
    if ($("full-history-table")) $("full-history-table").innerHTML = html + "</table>";
}

const deleteActiveProfile = () => {
    const u = $("user-selector").value;
    if (u === "CezArv") return alert("Cannot delete CezArv");
    if (confirm(`Delete ${u}?`)) {
        let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)).filter(i => i !== u);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        localStorage.removeItem(STORAGE_KEYS.PROFILES + u);
        localStorage.removeItem(STORAGE_KEYS.LOGS + u);
        location.reload();
    }
};

const renderUserSelector = () => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || ["CezArv"];
    if ($("user-selector")) $("user-selector").innerHTML = users.map(u => `<option value="${u}">${u}</option>`).join('');
};

function changeLang(l) {
    currentLang = l;
    localStorage.setItem('gym_last_lang', l); // new <---- save the lang to last user
    const lang = langData[l]; // FIX: Tu była jedynka zamiast "l"

    // Tłumaczenie etykiet
    if ($("lbl-user-title")) $("lbl-user-title").innerText = lang.user;
    if ($("lbl-focus-title")) $("lbl-focus-title").innerText = lang.focus;
    if ($("opt-hyper")) $("opt-hyper").innerText = lang.focusModes.hyper;
    if ($("opt-power")) $("opt-power").innerText = lang.focusModes.power;
    if ($("opt-shred")) $("opt-shred").innerText = lang.focusModes.shred;
    if ($("lbl-biometry-title")) $("lbl-biometry-title").innerText = lang.stats.title;
    if ($("lbl-bmi-text")) $("lbl-bmi-text").innerText = lang.stats.bmi + ":";
    if ($("lbl-weight-text")) $("lbl-weight-text").innerText = lang.stats.weight;
    if ($("lbl-exercise-title")) $("lbl-exercise-title").innerText = lang.ex;
    if ($("lbl-choose-ex")) $("lbl-choose-ex").innerText = lang.ui.chooseEx + ":";
    if ($("opt-choose-ex")) $("opt-choose-ex").innerText = "-- " + lang.ui.chooseEx + " --";
    if ($("title-manual-inject")) $("title-manual-inject").innerText = "💉 " + lang.ui.manualTitle;
    if ($("last-result-info")) $("last-result-info").innerText = lang.select;
    if ($("lbl-save-inj-btn")) $("lbl-save-inj-btn").innerText = lang.ui.injSaveBtn;
    if ($("btn-save-workout")) $("btn-save-workout").innerText = lang.save;
    if ($("viewHistoryBtn")) $("viewHistoryBtn").innerText = lang.historyBtn;
    if ($("lbl-archive-title")) $("lbl-archive-title").innerText = lang.ui.strengthArchive;

    // Tłumaczenie Placeholderów (to jest kluczowe!)
    // FIX: Dla inputów używamy .placeholder, nie .innerText

    if ($("inj-name")) $("inj-name").placeholder = (l === 'pl' ? "Co robiłeś?" : "What did you do?");
    if ($("inj-details")) $("inj-details").placeholder = (l === 'pl' ? "Sery/Powt/Kg" : "Sets/Reps/Weight");
    if ($("weight-in")) $("weight-in").placeholder = lang.weight;
    if ($("reps-in")) $("reps-in").placeholder = lang.reps;

    // ... i tak dalej dla każdego ID

    // Tłumaczenie listy ćwiczeń (select)
    const select = $("exercise-type");
    if (select) {
        const options = select.querySelectorAll('option');
        options.forEach(opt => {
            if (opt.value && lang.exNames[opt.value]) {
                opt.innerText = lang.exNames[opt.value];
            }
        });
    }

    syncBiometryUI();
    renderLog(); // Wywołujemy bez argumentu, funkcja sama sobie pobierze logi
    console.log(`SYSTEM // Language switched to: ${l.toUpperCase()}`);
}

const langData = {
    en: {
        user: "User",
        focus: "Training Focus:",
        ex: "Exercise:", weight: "Weight (kg)",
        reps: "Reps",
        save: "SAVE SESSION",
        historyBtn: "HISTORY",
        select: "Select exercise to see stats...",
        prompts: {
            enterName: "Enter name:"
        },
        stats: {
            title: "---BODY METRICS---",
            bmi: "BMI",
            weight: "Weight (kg)",
            unitLabel: "System: ",
            challenge: "Challenges"
        },
        biometryStatus: {
            "Underweight": "Underweight",
            "Normal": "Normal",
            "Overweight": "Overweight",
            "Obese": "Obese",
            "Fit/Form": "Fit/Form",
            "Athletic/Heavy": "Athletic/Heavy"
        },
        focusModes: {
            hyper: "Hypertrophy (90s rest)",
            power: "Power (180s rest)",
            shred: "Cut/Shred (60s rest)"
        },
        ui: {
            alertEmpty: "fill both fields!",
            chooseEx: "Choose Exercise",
            archive: "STRENGTH ARCHIVE",
            manualTitle: "MANUAL INJECT",
            strengthArchive: "Strength Archive",
            injSaveBtn: "Add",
            injectTitle: "Manual Entry",
            activityTitle: "Activity",
            setLabel: "Set"
        },

        exNames: {
            // Chest
            "Chest-Bench-Press": "Flat Bench Press (Barbell)",
            "Chest-DB-Press": "Dumbbell Press",
            "Chest-Incline-Barbell": "Incline Press (Barbell)",
            "Chest-Incline-DB": "Incline Press (Dumbbell)",
            "Chest-Flyes": "Dumbbell Flyes",
            "Chest-Pushups-Standard": "Pushups (Standard)",
            "Chest-Dips": "Chest Dips",
            // Back
            "Back-Deadlift": "Deadlift (Conventional)",
            "Back-Deadlift-Sumo": "Sumo Deadlift",
            "Back-Pull-Ups": "Pull-Ups (BW/Weighted)",
            "Back-Lat-Pulldown": "Lat Pulldown",
            "Back-Row-Barbell": "Barbell Row",
            "Back-Row-Dumbbell": "Dumbbell Row",
            "Back-Seated-Row": "Seated Cable Row",
            "Back-Hyperextensions": "Hyperextensions",
            // Shoulders
            "Shoulder-Military": "Military Press (Barbell)",
            "Shoulder-DB-Press": "Dumbbell Shoulder Press",
            "Shoulder-Lateral-Raises": "Lateral Raises",
            "Shoulder-Front-Raises": "Front Raises",
            "Shoulder-Face-Pulls": "Face Pulls",
            "Shoulder-Rear-Delt-Flyes": "Rear Delt Flyes",
            "Shoulder-Landmine-Press": "Landmine Press",
            // Arms
            "Arms-BB-Curl": "Barbell Curl",
            "Arms-DB-Hammer": "Hammer Curls",
            "Arms-Preacher-Curl": "Preacher Curl",
            "Arms-Pushdowns": "Triceps Pushdown (Cable)",
            "Arms-Skull-Crushers": "Skull Crushers",
            "Arms-Dips-Triceps": "Dips (Triceps Focus)",
            "Arms-Overhead-Ext": "Overhead Triceps Extension",
            // Legs
            "Legs-Squats": "Back Squats",
            "Legs-Front-Squat": "Front Squat",
            "Legs-Bulgarian": "Bulgarian Split Squat",
            "Legs-Leg-Press": "Leg Press",
            "Legs-Leg-Extension": "Leg Extension",
            "Legs-Leg-Curl": "Leg Curl",
            "Legs-Lunge": "Lunges",
            "Legs-Calf-Standing": "Standing Calf Raises",
            "Legs-Calf-Seated": "Seated Calf Raises",
            // ABS
            "ABS-Crunches": "Crunches",
            "ABS-Leg-Raises": "Leg Raises",
            "ABS-Plank": "Plank",
            "ABS-Russian-Twist": "Russian Twist",
            "ABS-Ab-Wheel": "Ab Wheel Rollout"
        }
    },

    pl: {
        user: "Uzytkownik",
        focus: "Cel:",
        ex: "Cwiczenie:",
        weight: "Ciezar (kg)",
        reps: "Powt.",
        save: "ZAPISZ",
        historyBtn: "HISTORIA",
        select: "Wybierz ćwiczenie, aby zobaczyć statystyki... ",
        prompts: {
            enterName: "Podaj imię:"
        },
        stats: {
            title: "---PARAMETRY---",
            bmi: "BMI",
            weight: "Waga (kg)",
            unitLabel: "System ",
            challenge: "Wyzwania"
        },
        biometryStatus: {
            "Underweight": "Niedowaga",
            "Normal": "Norma",
            "Overweight": "Nadwaga",
            "Obese": "Otyłość",
            "Fit/Form": "Forma/Fit",
            "Athletic/Heavy": "Atletyczna/Masa"
        },

        focusModes: {
            hyper: "Hipertrofia (90s odpoczynku)",
            power: "Siła (180s odpoczynku)",
            shred: "Rzeźba/Redukcja (60s odpoczynku)"
        },
        ui: {
            archive: "ARCHIWUM SIŁY",
            selectEx: "Wybierz ćwiczenie...",
            filter: "Filtruj miesiąc",
            alertEmpty: "Uzupełnij wszystkie pola!",
            manualTitle: "WPIS RĘCZNY",
            chooseEx: "Wybierz ćwiczenie",
            strengthArchive: "Archiwum Siły",
            injSaveBtn: "Dodaj",
            injectTitle: "Ręczny wpis",
            filterMonth: "Filtruj miesiąc",
            activityTitle: "Aktywność",
            setLabel: "Seria"
        },
        exNames: {
            // Klatka
            "Chest-Bench-Press": "Wyciskanie na plaskiej (sztanga)",
            "Chest-DB-Press": "Wyciskanie hantli",
            "Chest-Incline-Barbell": "Wyciskanie skos dodatni (sztanga)",
            "Chest-Incline-DB": "Wyciskanie skos dodatni (hantle)",
            "Chest-Flyes": "Rozpietki",
            "Chest-Pushups-Standard": "Pompki klasyczne",
            "Chest-Dips": "Dipsy (Klatka)",
            // Plecy
            "Back-Deadlift": "Martwy ciag klasyczny",
            "Back-Deadlift-Sumo": "Martwy ciag sumo",
            "Back-Pull-Ups": "Podciaganie na drazku",
            "Back-Lat-Pulldown": "Sciaganie drazka wyciagu",
            "Back-Row-Barbell": "Wioslowanie sztanga",
            "Back-Row-Dumbbell": "Wioslowanie hantlem",
            "Back-Seated-Row": "Przyciaganie linki wyciagu (siedzac)",
            "Back-Hyperextensions": "Wyprosty na lawce rzymskiej",
            // Barki
            "Shoulder-Military": "Wyciskanie zolnierskie",
            "Shoulder-DB-Press": "Wyciskanie hantli (barki)",
            "Shoulder-Lateral-Raises": "Wznosy hantli bokiem",
            "Shoulder-Front-Raises": "Wznosy przodem",
            "Shoulder-Face-Pulls": "Face Pulls",
            "Shoulder-Rear-Delt-Flyes": "Odwrotne rozpietki",
            "Shoulder-Landmine-Press": "Landmine Press",
            // Ramiona
            "Arms-BB-Curl": "Uginanie ramion ze sztanga",
            "Arms-DB-Hammer": "Uginanie mlotkowe",
            "Arms-Preacher-Curl": "Modlitewnik",
            "Arms-Pushdowns": "Prostowanie ramion (wyciag)",
            "Arms-Skull-Crushers": "Wyciskanie francuskie",
            "Arms-Dips-Triceps": "Dipsy (Triceps)",
            "Arms-Overhead-Ext": "Wyciskanie francuskie nad glowe",
            // Nogi
            "Legs-Squats": "Przysiady ze sztanga",
            "Legs-Front-Squat": "Przysiad przedni",
            "Legs-Bulgarian": "Przysiad bulgarski",
            "Legs-Leg-Press": "Wypychanie na suwnicy",
            "Legs-Leg-Extension": "Prostowanie nog na maszynie",
            "Legs-Leg-Curl": "Uginanie nog na maszynie",
            "Legs-Lunge": "Wykroki",
            "Legs-Calf-Standing": "Wspiecia na palce stojac",
            "Legs-Calf-Seated": "Wspiecia na palce siedzac",
            // Brzuch
            "ABS-Crunches": "Brzuszki",
            "ABS-Leg-Raises": "Wznosy nog",
            "ABS-Plank": "Plank (deska)",
            "ABS-Russian-Twist": "Russian Twist",
            "ABS-Ab-Wheel": "Koleko (Ab Wheel)"
        }
    }
};

window.onload = initializeArvGym;

function injectExercise() {
    const name = $('inj-name').value;
    const details = $('inj-details').value;
    const activeUserName = $("user-selector").value;
    // validation
    if (!name || !details || !activeUser) {
         alert("Fill all fields!");
         return;
    }
    // take existing logs for existing user
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS + activeUser)) || [];
    // 
    logs.unshift({
        exercise: `[MANUAL] ${name}`,
        weight: details,
        reps: "---",
        rpe: "---",
        date: new Date().toLocaleDateString()
    });

    localStorage.setItem(STORAGE_KEYS.LOGS + activeUser,
        JSON.stringify(logs));
        // reresh list
    renderLog(logs);
        // clearing fields for inputs
    $("inj-name").value = '';
    $("inj-details").value = '';
}

const entry = {
    id: Date.now(),
    time: new Date().toLocaleTimeString(),
    exercise: `[MANUAL] ${name}`,
    details: details
};

// Próbujemy znaleźć Twoją tablicę danych (szukamy pod różnymi nazwami)
let targetLog = null;
if (typeof workoutLogs !== 'undefined') targetLog = workoutLogs;
else if (typeof workoutData !== 'undefined') targetLog = workoutData;
else if (typeof logs !== 'undefined') targetLog = logs;

if (targetLog) {
    targetLog.push(entry);
    // Próbujemy odświeżyć widok - szukamy Twojej funkcji renderującej
    if (typeof renderLogs === 'function') renderLogs();
    else if (typeof updateUI === 'function') updateUI();
    else if (typeof displayWorkout === 'function') displayWorkout();

    // Zapisujemy w pamięci
    localStorage.setItem('arvGymData', JSON.stringify(targetLog));

    $('inj-name').value = '';
    $('inj-details').value = '';
} else {
    alert("System nie widzi bazy danych. Sprawdź konsolę (F12).");
}
}

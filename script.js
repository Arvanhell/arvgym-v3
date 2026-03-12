// --- CONFIG ARVGYM 3.0 ---
const APP_VERSION = "3.0.0";

function calculateBMI(weight, height) {
    let heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
}

let userProfile = JSON.parse(localStorage.getItem('arvGymProfile')) || {
  height: 180,
  currentWeight: 80,
  unitSystem: 'metric' // metric or imperial
};

// --- 3. BIOMETRIA ---
function updateBiometry() {
    const heightM = userProfile.height / 100;
    const bmiVal = (userProfile.currentWeight / (heightM * heightM)).toFixed(1);
    const d = langData[currentLang].stats;
    
    if ($("lbl-biometry-title")) $("lbl-biometry-title").innerText = d.title;
    if ($("lbl-bmi-text")) $("lbl-bmi-text").innerText = d.bmi;
    if ($("lbl-weight-text")) $("lbl-weight-text").innerText = d.weight;
    
    if ($("bmi-value")) {
        $("bmi-value").innerText = bmiVal;
        $("bmi-value").style.color = (bmiVal < 18.5 || bmiVal > 25) ? "#ff4444" : "#00ff88";
    }
    if ($("current-body-weight")) {
        $("current-body-weight").innerText = userProfile.currentWeight + " kg";
    }
}

// 1. Pomocnik i Dane
const $ = (id) => document.getElementById(id);
let workoutHistory = JSON.parse(localStorage.getItem('workoutLogs')) || [];


// --- 1. POMOCNIK LICZENIA SERII ---
function getTodaySets(exerciseName) {
    const today = new Date().toLocaleDateString();
    return workoutHistory.filter(e => e.exercise === exerciseName && e.date === today).length + 1;
}

// --- 2. INTELIGENTNY RADAR (Wersja 2.0 - Burnout Update) ---
function showLastResult(exerciseName) {
    const infoBox = $("last-result-info");
    if (!infoBox) return;
    if (!exerciseName) {
        infoBox.innerHTML = (currentLang === 'pl') ? "Wybierz cwiczenie, aby zobaczyc statystyki..." : "Select exercise to see stats...";
        return;
    }
    
    // Filtrowanie historii pod konkretne ćwiczenie
    const exerciseHistory = workoutHistory.filter(e => e.exercise === exerciseName);
    const lastEntry = exerciseHistory[0]; 
    const allWeights = exerciseHistory.map(e => parseFloat(e.weight)).filter(w => !isNaN(w));
    const personalRecord = allWeights.length > 0 ? Math.max(...allWeights) : null;

    let content = `<b style="color:#00f2ff">${exerciseName}</b><br>`;
    
    if (lastEntry) {
        // Wyświetlanie ostatniego wyniku
        content += `⏱️ Last: <span style="color:#00f2ff">${lastEntry.weight}kg x ${lastEntry.reps}</span> (@RPE ${lastEntry.rpe})<br>`;
        if (personalRecord) content += `🏆 PR: <span style="color:#ffcc00">${personalRecord}kg</span><br>`;
        
        // --- LOGIKA ANALIZY PROGRESU ---
        const rpeVal = parseInt(lastEntry.rpe);

        if (rpeVal >= 15) {
            content += `<span style="color:#ff0000; font-weight:bold;">🔥 BURNOUT! Overload detected. Stay here.</span>`;
        } else if (rpeVal >= 12) {
            content += `<span style="color:#ff4444; font-weight:bold;">⚠️ HOT! Extreme effort. Keep load.</span>`;
        } else if (rpeVal >= 9) {
            content += `<span style="color:#ffcc00">💪 Heavy. Try +1 rep or +0.5kg next.</span>`;
        } else {
            content += `<span style="color:#00ff88">🚀 Solid! Push it: +2.5kg or +2 reps.</span>`;
        }
    } else {
        content += `<span style="color:#aaa">First time with this exercise! Build your base.</span>`;
    }

    // Licznik serii w bieżącej sesji
    const setsToday = getTodaySets(exerciseName);
    content += `<br><b style="color:#fff">Current Session: Set #${setsToday}</b>`;
    
    infoBox.innerHTML = content;
}

// --- 3. ZAPIS SESJI ---
function saveWorkoutToLog() {
    let exType = $("exercise-type").value;
    let weight = $("weight-in").value;
    let reps = $("reps-in").value;
    let rpe = $("rpe-select").value;
    let currentUser = $("user-selector").value;

    if (!exType) return alert(`${currentUser}, pick exercise!`);
    if (!reps) return alert("How many repetition!");

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const dayName = days[now.getDay()];

    if (weight === "" || weight === "0") weight = "BW";

    let entry = {
        user: currentUser,
        date: now.toLocaleDateString(),
        day: dayName,
        exercise: exType,
        weight: weight,
        reps: reps,
        rpe: rpe,
        set: getTodaySets(exType)
    };

    workoutHistory.unshift(entry);
    if (workoutHistory.length > 100) workoutHistory.pop(); 
    localStorage.setItem('workoutLogs', JSON.stringify(workoutHistory));
    
    renderLog();
    showLastResult(exType);
    startRestTimer();
    
    $("weight-in").value = "";
    $("reps-in").value = "";
}

// --- 4. WYŚWIETLANIE LISTY ---
function renderLog() {
    const listContainer = $("workout-list");
    if (!listContainer) return;
    listContainer.innerHTML = ""; 

    let titleText = (currentLang === 'pl') ? "Ostatnia Aktywnosc" : "Recent Activity";
    let html = `<h3 style="color:#00f2ff">${titleText}</h3><ul>`;
    
    workoutHistory.slice(0, 5).forEach(item => {
        let displayWeight = (item.weight === "BW") ? "BW" : item.weight + "kg";
        html += `
        <li style="border-bottom: 1px solid #333; padding: 8px 0; list-style:none; font-size:0.9em;">
            <small>${item.day} ${item.date} [${item.user}]</small><br>
            <b>${item.exercise}</b> [S#${item.set || 1}]<br>
            ${displayWeight} x ${item.reps} <span style="color:#00f2ff; float:right;">RPE ${item.rpe}</span>
        </li>`;
    });
    html += "</ul>";
    listContainer.innerHTML = html;
}

// --- 5. TIMER ---
let timerInterval;
function startRestTimer() {
    let seconds = parseInt($("training-goal").value) || 90;
    clearInterval(timerInterval);
    let timeLeft = seconds;
    const display = $("timer-display");
    const timeText = $("time-left");
    display.style.display = "block";
    timeText.innerText = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        timeText.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            display.innerHTML = "<b style='color:#00ff88; font-size:1.2em;'>🔥 GO! NEXT SET! 🔥</b>";
            if (window.navigator.vibrate) window.navigator.vibrate([300, 100, 300]);
            setTimeout(() => { display.style.display = "none"; display.innerHTML = `<span style="color:#aaa; font-size:0.8em;">RESTING...</span><br><span id="time-left" style="font-size:2.5em; color:#ffcc00; font-weight:bold;">90</span><span style="color:#ffcc00">s</span>`; }, 5000);
        }
    }, 1000);
}

// --- 6. UŻYTKOWNICY I JĘZYK ---
let currentLang = 'en';

window.addNewUser = function() {
    console.log("--> Start procedury addNewUser");
    const name = prompt(currentLang === 'pl' ? "Podaj imię:" : "Add Name:");
    
    if (name && name.trim() !== "") {
        const newName = name.trim();
        
        // 1. POBIERZ aktualny stan z pamięci
        let users = JSON.parse(localStorage.getItem('gym_users')) || ['Cezar'];
        console.log("Stan przed dodaniem:", users);

        // 2. SPRAWDŹ czy już go nie ma
        if (!users.includes(newName)) {
            users.push(newName);
            
            // 3. ZAPISZ nową tablicę do localStorage
            localStorage.setItem('gym_users', JSON.stringify(users));
            console.log("Stan po zapisie:", users);

            // 4. ODPAL ładowanie listy od nowa
            window.loadUsers(); 
            
            // 5. USTAW selektor na nową osobę
            const select = document.getElementById("user-selector");
            if(select) select.value = newName;
            
            alert(currentLang === 'pl' ? `Witaj, ${newName}!` : `Welcome, ${newName}!`);
        } else {
            alert(currentLang === 'pl' ? "Użytkownik już istnieje!" : "User exists!");
        }
    } else {
        console.log("Anulowano wpisywanie lub puste pole.");
    }
};

window.loadUsers = function() {
    const select = document.getElementById("user-selector");
    if (!select) return;

    // Pobieramy to, co jest w localStorage
    let storedUsers = localStorage.getItem('gym_users');
    let users = storedUsers ? JSON.parse(storedUsers) : []; // Jeśli pusto, to pusta tablica

    select.innerHTML = "";

    // Opcja domyślna, która zawsze zachęca do wyboru/dodania
    let defaultOpt = document.createElement('option');
    defaultOpt.text = (currentLang === 'pl') ? "-- Wybierz profil --" : "-- Select Profile --";
    defaultOpt.value = "";
    select.add(defaultOpt);

    // Dodajemy tylko realnych użytkowników z pamięci
    users.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.text = name;
        select.add(option);
    });
};

const langData = {
    en: { user: "User",
          focus: "Training Focus:",
          ex: "Choose Exercise:",
          weight: "Weight (kg)",
          reps: "Reps",
          save: "SAVE SESSION",
          recent: "Recent Activity",
          historyBtn: "VIEW FULL HISTORY",
          stats: {
            title: "---BODY METRICS---",
            bmi: "BMI",
            unitLabel: "System: ",
            challenge: "Challenges"
          },
          units: {metric: "Metric (kg)",
                  imperial: "Imperial (lbs)"
          },
          exNames : {
              "Chest-Bench-Press": "Flat Bench Press (Barbell)",
              "Chest-DB-Press": "Dumbbell Press",
              "CHest-Incline-Press": "Incline Press",
              "Chest-Flyes": "Dumbbell Flyes",
              "Chest-Pushups-Standards": "Pushup (Standard)",
              "Chest-Pushup-Wide": "Pushup (Wide)",
              "Chest-Pushup-Diamond": "Pushup (Diamond)",
              "Chest-Dips": "Chest Focus",
              "Back-Deadlift": "Deadlift",
              "Back-Pull-Ups": "Pull-Ups (BW)",
              "Back-Lat-Pulldown": "Lat Puldown",
              "Back-Row-Barbell": "Barbell Row",
              "Back-Row-Dumbbell":"Dumbbell Row",
              "Back-Hyperextensions": "Hyperextensions",
              "Shoulder-Military": "Military Press",
              "Shoulder-DB-Press": "Dumbbell Shoulder Press",
              "Shoulder-Lateral-Raises": "Lateral Raises",
              "Shoulder-Front-raises": "Front Raises",
              "Shoulder-Face-Pulls": "Face Pulls",
              "Shoulder-Rear-Delt-Flyes": "Rear Delt Flyes",
              "Arms-Preacher-Curl": "Preacher Curl (Machine)",
              "Arms-BB-Curl": "Barbell Curl (Biceps)",
              "Arms-DB-Hammer": "Hammer Curls",
              "Arms-Pushdowns": "Triceps Pushdown (Cable)",
              "Arms-Skull-Crushers": "Skull Crushers",
              "Arms-Dips-Triceps": "Dips (Triceps Focus)",
              "Legs-Squats": "Back Squats",
              "Legs-Leg-Press": "Leg Press",
              "Legs-Leg-Extension": "Leg Extension",
              "Legs-Leg-Curl": "Leg Curl",
              "Legs-Lunge": "Lunges",
              "Legs-Calf-Standing": "Standing Calf Raises",
              "Legs-Calf-Seated": "Seated Calf Raises",
              "ABS-Crunches": "Crunches",
              "ABS-Leg-Raises": "Leg Raises",
              "ABS-Plank": "Plank",
              "ABS-Russian-Twist": "Russian Twist"
          }
},

    pl: { user: "Uzytkownik",
          focus: "Cel Treningu:",
          ex: "Wybierz Cwiczenie:",
          weight: "Ciezar (kg)", 
          reps: "Powtorzenia", 
          save: "ZAPISZ TRENING", 
          recent: "Ostatnia Aktywnosc",
          historyBtn: "PELNA HISTORIA",
          stats: {
            title: "---Parametry Ciala---",
            bmi: "Twoje BMI",
            weight: "Aktualna Waga (kg)",
            unitLabel: "System ",
            challenge: "Wyzwania"
          },
          units: { metric: "Metryczny (kg)", imperial: "Imperialny (lbs)"},
          exNames: {
              "Chest-Bench-Press": "Wyciskanie na plaskiej (sztanga)",
              "Chest-DB-Press": "Wyciskanie hantli",
              "Chest-Incline-Press": "Wyciskanie skos dodatni",
              "Chest-Flyes": "Rozpietki z hantlami",
              "Chest-Pushups-Standard": "Pompki klasyczne",
              "Chest-Pushups-Wide": "Pompki szerokie",
              "Chest-Pushups-Diamond": "Pompki diamentowe",
              "Chest-Pushups-OneArm": "Pompki jednoracz",
              "Chest-Dips": "Dipsy (Klatka)",
              "Back-Deadlift": "Martwy ciag",
              "Back-Pull-Ups": "Podciaganie (Ciezar ciala)",
              "Back-Lat-Pulldown": "Sciaganie drazka",
              "Back-Row-Barbell": "Wioslowanie sztanga",
              "Back-Hyperextensions": "Wyprost na lawce rzymskiej",
              "Shoulder-Military": "Wyciskanie zolnierskie",
              "Shoulder-DB-Press": "Wyciskanie hantli siedzac",
              "Shoulder-Lateral-Raises": "Wznosy bokiem",
              "Shoulder-Front-Raises": "Wznosy przodem",
              "Shoulder-Face-Pulls": "Przyciaganie do twarzy",
              "Shoulder-Rear-Delt-Flyes": "Odwrotne Rozpietki",
              "Arms-Preacher-Curl": "Modlitewnik (Maszyna)",
              "Arms-BB-Curl": "Uginanie ramion ze sztanga",
              "Arms-DB-Hammer": "Uginanie mlotkowe",
              "Arms-Pushdowns": "Prostowanie ramion (Wyciag)",
              "Arms-Skull-Crushers": "Wyciskanie francuskie",
              "Arms-Dips-Triceps": "Dipsy (Triceps)",
              "Legs-Squats": "Przysiady ze sztanga",
              "Legs-Leg-Press": "Suwnica",
              "Legs-Leg-Extension": "Prostowanie nog",
              "Legs-Leg-Curl": "Uginanie nog",
              "Legs-Lunge": "Wykroki",
              "Legs-Calf-Standing": "Wspiecia stojac",
              "Legs-Calf-Saeted": "Wspiecia siedzac",
              "ABS-Crunches": "Brzuszki",
              "ABS-Leg-Raises": "Wznosy nog",
              "ABS-Plank": "Plank (deska)",
              "ABS-Rusian-Twist": "Russian Twist"
          }
    }
};
// --- 4. ZMIANA JĘZYKA ---
function changeLang(lang) {
    currentLang = lang;
    const d = langData[lang];

    if ($("lbl-user-select")) $("lbl-user-select").innerText = d.user;
    const labels = document.querySelectorAll('.input-group label');
    if (labels[0]) labels[0].innerText = d.focus;
    if (labels[1]) labels[1].innerText = d.ex;

    if ($("weight-in")) $("weight-in").placeholder = d.weight;
    if ($("reps-in")) $("reps-in").placeholder = d.reps;
    
    const saveBtn = document.querySelector('.save-btn');
    if (saveBtn) saveBtn.innerText = d.save;
    if ($("viewHistoryBtn")) $("viewHistoryBtn").innerText = d.historyBtn;

    updateBiometry();
    renderLog();
}

// --- 5. LOGIKA RADARU I ZAPISU ---
function showLastResult(exerciseName) {
    const infoBox = $("last-result-info");
    if (!infoBox || !exerciseName) return;

    const exerciseHistory = workoutHistory.filter(e => e.exercise === exerciseName);
    const lastEntry = exerciseHistory[0];
    
    let displayName = (currentLang === 'pl' && langData.pl.exNames[exerciseName]) 
                      ? langData.pl.exNames[exerciseName] : exerciseName;

    let content = `<b style="color:#00f2ff">${displayName}</b><br>`;
    
    if (lastEntry) {
        content += `Last: ${lastEntry.weight}kg x ${lastEntry.reps} (@RPE ${lastEntry.rpe})`;
        // Tu Twoja logika RPE (Burnout, Hot itd.)
    } else {
        content += `<span style="color:#aaa">First time! Build your base.</span>`;
    }
    infoBox.innerHTML = content;
}

function saveWorkoutToLog() {
    let entry = {
        user: $("user-selector").value,
        date: new Date().toLocaleDateString(),
        day: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()],
        exercise: $("exercise-type").value,
        weight: $("weight-in").value || "BW",
        reps: $("reps-in").value,
        rpe: $("rpe-select").value
    };

    if (!entry.exercise || !entry.reps) return alert("Fill all data!");

    workoutHistory.unshift(entry);
    localStorage.setItem('workoutLogs', JSON.stringify(workoutHistory));
    
    renderLog();
    startRestTimer();
}

// --- 6. MODAL HISTORII ---
function showHistory() {
    const modal = $("history-modal"); // Zsynchronizowane z Twoim HTML
    if (modal) {
        modal.style.display = "block";
        renderFullHistory();
    }
}

function renderFullHistory() {
    const container = $("full-history-table");
    if (!container) return;

    let html = `<table style="width:100%; border-collapse:collapse; color:white;">`;
    workoutHistory.forEach(entry => {
        let displayEx = (currentLang === 'pl' && langData.pl.exNames[entry.exercise]) 
                        ? langData.pl.exNames[entry.exercise] : entry.exercise;
        html += `<tr style="border-bottom:1px solid #333;">
            <td style="padding:10px;">${entry.date}</td>
            <td style="padding:10px;"><b>${displayEx}</b></td>
            <td style="padding:10px; color:#00f2ff;">${entry.weight}x${entry.reps}</td>
        </tr>`;
    });
    html += `</table>`;
    container.innerHTML = html;
}

function closeHistoryModal() {
    $("history-modal").style.display = "none";
}

// --- 7. START ---
window.onload = () => {
    console.log("System start...")
    window.loadUsers();       // Ładuje listę z pamięci
    if (typeof changeLang === 'function') {
        changeLang('en');
    } // Ustawia język i przy okazji odpala updateBiometry()
};



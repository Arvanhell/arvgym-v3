// --- CONFIG ARVGYM 3.0 ---
const APP_VERSION = "3.0.0";

// --- 1. HELPERS & DATA INITIALIZATION ---
const $ = (id) => document.getElementById(id);
let workoutHistory = JSON.parse(localStorage.getItem('workoutLogs')) || [];
let currentLang = 'en';

// --- 2. BIOMETRICS ENGINE (WEIGHT, HEIGHT & BODY TYPE) ---

/**
 * Calculates BMI and returns a descriptive status with color coding
 */
function getBMIDetails(weight, height) {
    if (!height || height === 0) return { value: 0, status: "N/A", color: "#aaa" };
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
    
    let status = "Normal";
    let color = "#00ff88"; // Green

    if (bmi < 18.5) { status = "Underweight"; color = "#00f2ff"; }
    else if (bmi >= 25 && bmi < 30) { status = "Overweight"; color = "#ffcc00"; }
    else if (bmi >= 30) { status = "Obese"; color = "#ff4444"; }

    if (currentLang === 'pl') {
        const trans = { "Underweight": "Niedowaga", "Normal": "Norma", "Overweight": "Nadwaga", "Obese": "Otyłość" };
        status = trans[status] || status;
    }
    return { value: bmi, status: status, color: color };
}

// Global user profile state - initialized with default values or from storage
let userProfile = JSON.parse(localStorage.getItem('arvGymProfile')) || {
  height: 180,
  currentWeight: 80,
  bodyType: "Athletic",
  unitSystem: 'metric' 
};

// Main UI Update for the Biometrics Section
function updateBiometry() {
    if (typeof langData === 'undefined' || !langData[currentLang]) return;
    
    const bmiData = getBMIDetails(userProfile.currentWeight, userProfile.height);
    const d = langData[currentLang].stats;
    
    // Update labels for the section
    if ($("lbl-biometry-title")) $("lbl-biometry-title").innerText = d.title;
    if ($("lbl-bmi-text")) $("lbl-bmi-text").innerText = d.bmi;
    if ($("lbl-weight-text")) $("lbl-weight-text").innerText = d.weight;
    
    // Update BMI value and descriptive status
    const bmiValueDisplay = $("bmi-value");
    if (bmiValueDisplay) {
        bmiValueDisplay.innerText = bmiData.value;
        bmiValueDisplay.style.color = bmiData.color;
        bmiValueDisplay.innerHTML += ` <span style="font-size:0.5em; opacity:0.8; margin-left:5px;">(${bmiData.status})</span>`;
    }
    
    // Update Combined Stats: Weight, Height and chosen Body Type
    if ($("current-body-weight")) {
        const bType = userProfile.bodyType || (currentLang === 'pl' ? "Nieokreślona" : "Not set");
        $("current-body-weight").innerHTML = `
            <span style="font-size:1.1em; letter-spacing:1px;">${userProfile.currentWeight}kg / ${userProfile.height}cm</span><br>
            <span style="color:#00f2ff; font-size:0.85em; font-weight:bold; text-transform:uppercase;">[ ${bType} ]</span>
        `;
    }
}

// Interactive update of all biometric parameters
function promptBiometryUpdate() {
    const isPl = currentLang === 'pl';
    
    // 1. Weight prompt
    const newWeight = prompt(isPl ? "Podaj wagę (kg):" : "Enter weight (kg):", userProfile.currentWeight);
    if (newWeight === null) return; 

    // 2. Height prompt
    const newHeight = prompt(isPl ? "Podaj wzrost (cm):" : "Enter height (cm):", userProfile.height);
    if (newHeight === null) return; 

    // 3. Body Type selection prompt
    const types = isPl 
        ? "1: Chudy, 2: Szczupły, 3: Atletyczny, 4: Muskularny, 5: Otyły" 
        : "1: Ectomorph, 2: Lean, 3: Athletic, 4: Muscular, 5: Endomorph";
    const typeChoice = prompt(`${isPl ? "Wybierz budowę ciała (1-5):" : "Choose body type (1-5):"}\n${types}`, "3");
    
    const typeMap = isPl 
        ? { "1": "Chudy", "2": "Szczupły", "3": "Atletyczny", "4": "Muskularny", "5": "Otyły" }
        : { "1": "Ectomorph", "2": "Lean", "3": "Athletic", "4": "Muscular", "5": "Endomorph" };

    const w = parseFloat(newWeight);
    const h = parseFloat(newHeight);

    if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0) {
        userProfile.currentWeight = w;
        userProfile.height = h;
        if (typeMap[typeChoice]) userProfile.bodyType = typeMap[typeChoice];
        
        // Save to persistent storage
        localStorage.setItem('arvGymProfile', JSON.stringify(userProfile)); 
        
        // Refresh UI
        updateBiometry(); 
        console.log(`System: Profile recalibrated for ${userProfile.currentWeight}kg, ${userProfile.height}cm, Type: ${userProfile.bodyType}`);
    } else {
        alert(isPl ? "Błędne dane! Wprowadź poprawne liczby." : "Invalid input! Please enter valid numbers.");
    }
}

// Backward compatibility with HTML onclick
window.promptWeightUpdate = promptBiometryUpdate;


// --- 3. TRAINING LOGIC & RADAR ---

function getTodaySets(exerciseName) {
    const today = new Date().toLocaleDateString();
    return workoutHistory.filter(e => e.exercise === exerciseName && e.date === today).length + 1;
}

function showLastResult(exerciseName) {
    const infoBox = $("last-result-info");
    if (!infoBox) return;
    if (!exerciseName) {
        infoBox.innerHTML = (currentLang === 'pl') ? "Wybierz cwiczenie..." : "Select exercise...";
        return;
    }
    
    const exerciseHistory = workoutHistory.filter(e => e.exercise === exerciseName);
    const lastEntry = exerciseHistory[0]; 
    const allWeights = exerciseHistory.map(e => parseFloat(e.weight)).filter(w => !isNaN(w));
    const personalRecord = allWeights.length > 0 ? Math.max(...allWeights) : null;

    let content = `<b style="color:#00f2ff">${exerciseName}</b><br>`;
    
    if (lastEntry) {
        content += `⏱️ Last: <span style="color:#00f2ff">${lastEntry.weight}kg x ${lastEntry.reps}</span> (@RPE ${lastEntry.rpe})<br>`;
        if (personalRecord) content += `🏆 PR: <span style="color:#ffcc00">${personalRecord}kg</span><br>`;
        
                // --- RADAR ANALYSIS LOGIC ---
                const rpeVal = parseInt(lastEntry.rpe);
                let statusColor = "#00ff88";
                let message = "🚀 Solid! Push it: +2.5kg or +2 reps.";
        
                if (rpeVal >= 15) {
                    statusColor = "#ff0000";
                    message = "🔥 BURNOUT! Overload detected. Stay here.";
                    infoBox.style.border = "1px solid #ff0000";
                    infoBox.style.animation = "pulse-red 2s infinite";
                } else if (rpeVal >= 12) {
                    statusColor = "#ff4444";
                    message = "⚠️ HOT! Extreme effort. Keep load.";
                    infoBox.style.border = "1px solid #ff4444";
                } else if (rpeVal >= 9) {
                    statusColor = "#ffcc00";
                    message = "💪 Heavy. Try +1 rep next.";
                    infoBox.style.border = "1px solid #ffcc00";
                } else {
                    infoBox.style.border = "1px solid #00f2ff";
                    infoBox.style.animation = "none";
                }
        
                content += `<span style="color:${statusColor}; font-weight:bold;">${message}</span>`;
            }
    const setsToday = getTodaySets(exerciseName);
    content += `<br><b style="color:#fff">Current Session: Set #${setsToday}</b>`;
    infoBox.innerHTML = content;
} 


function saveWorkoutToLog() {
    let exType = $("exercise-type").value;
    let weight = $("weight-in").value;
    let reps = $("reps-in").value;
    let rpe = $("rpe-select").value;
    let currentUser = $("user-selector").value;

    if (!exType || !reps) return alert("Fill required data!");

    if (weight === "" || weight === "0") weight = "BW";

    let entry = {
        user: currentUser,
        date: new Date().toLocaleDateString(),
        day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()],
        exercise: exType,
        weight: weight,
        reps: reps,
        rpe: rpe,
        set: getTodaySets(exType)
    };

    workoutHistory.unshift(entry);
    localStorage.setItem('workoutLogs', JSON.stringify(workoutHistory));
    
    renderLog();
    showLastResult(exType);
    startRestTimer();
}

function renderLog() {
    const listContainer = $("workout-list");
    if (!listContainer) return;
    listContainer.innerHTML = ""; 
    let html = `<h3 style="color:#00f2ff">${currentLang === 'pl' ? 'Aktywnosc' : 'Activity'}</h3><ul>`;
    workoutHistory.slice(0, 5).forEach(item => {
        html += `<li style="border-bottom: 1px solid #333; padding: 5px 0; list-style:none; font-size:0.85em;">
            <b>${item.exercise}</b>: ${item.weight}kg x ${item.reps} <small>(RPE ${item.rpe})</small>
        </li>`;
    });
    listContainer.innerHTML = html + "</ul>";
}

// --- 3.1 INPUT VISUAL FEEDBACK ---
function applyInputFeedback() {
    const weightIn = $("weight-in");
    const rpeIn = $("rpe-select");

    if (weightIn) {
        weightIn.addEventListener('input', () => {
            // Highlight when pushing heavy iron
            weightIn.style.borderColor = weightIn.value > 100 ? "#00f2ff" : "#333";
            weightIn.style.boxShadow = weightIn.value > 100 ? "0 0 10px #00f2ff" : "none";
        });
    }

    if (rpeIn) {
        rpeIn.addEventListener('change', () => {
            // Color feedback based on effort (RPE)
            const val = parseInt(rpeIn.value);
            if (val >= 15) rpeIn.style.color = "#ff4444"; // Danger/Burnout
            else if (val >= 10) rpeIn.style.color = "#ffcc00"; // Heavy
            else rpeIn.style.color = "#00ff88"; // Solid
        });
    }
}

// --- 4. TIMER SYSTEM ---
let timerInterval;
function startRestTimer() {
    let seconds = parseInt($("training-goal").value) || 90;
    clearInterval(timerInterval);
    let timeLeft = seconds;
    const display = $("timer-display");
    if (display) display.style.display = "block";

    timerInterval = setInterval(() => {
        timeLeft--;
        if ($("time-left")) $("time-left").innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            const sound = $("timer-sound");
            if (sound) sound.play().catch(() => {});
            if (window.navigator.vibrate) window.navigator.vibrate([300, 100, 300]);
            if (display) display.innerHTML = "<b>🔥 GO! 🔥</b>";
            setTimeout(() => { if(display) display.style.display = "none"; }, 3000);
        }
    }, 1000);
}

// --- 5. LOCALIZATION DATA (FULL SET) ---// --- 5. LOCALIZATION DATA (FULL ARSENAL) ---
const langData = {
    en: {
        user: "User", focus: "Training Focus:", ex: "Exercise:", weight: "Weight (kg)", reps: "Reps",
        save: "SAVE SESSION", recent: "Recent Activity", historyBtn: "HISTORY",
        stats: { title: "---BODY METRICS---", bmi: "BMI", weight: "Weight (kg)", unitLabel: "System: ", challenge: "Challenges" },
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
        user: "Uzytkownik", focus: "Cel:", ex: "Cwiczenie:", weight: "Ciezar (kg)", reps: "Powt.",
        save: "ZAPISZ", recent: "Aktywnosc", historyBtn: "HISTORIA",
        stats: { title: "---PARAMETRY---", bmi: "BMI", weight: "Waga (kg)", unitLabel: "System ", challenge: "Wyzwania" },
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


function changeLang(lang) {
    currentLang = lang;
    const d = langData[lang];
    if ($("lbl-user-select")) $("lbl-user-select").innerText = d.user;
    const saveBtn = document.querySelector('.save-btn');
    if (saveBtn) saveBtn.innerText = d.save;
    updateBiometry();
    renderLog();
}

// --- 6. INITIALIZATION ---
window.loadUsers = function() {
    const select = $("user-selector");
    if (!select) return;
    let users = JSON.parse(localStorage.getItem('gym_users')) || ['CezArv'];
    select.innerHTML = "";
    users.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name; opt.text = name;
        select.add(opt);
    });
};

window.onload = () => {
    window.loadUsers();       
    changeLang('en'); 
    applyInputFeedback();
};

window.promptAddUser = function() {
    const newName = prompt(currentLang === 'pl' ? "Podaj imię nowego użytkownika:" : "Enter new user name:");
    
    if (newName && newName.trim() !== "") {
        let users = JSON.parse(localStorage.getItem('gym_users')) || ['ARV'];
        
        if (users.includes(newName.trim())) {
            alert(currentLang === 'pl' ? "Ten profil już istnieje!" : "This profile already exists!");
            return;
        }
        
        users.push(newName.trim());
        localStorage.setItem('gym_users', JSON.stringify(users));
        
        window.loadUsers(); // Odświeża listę w selektorze
        $("user-selector").value = newName.trim(); // Przełącza na nowego usera
        alert(currentLang === 'pl' ? "Dodano użytkownika: " + newName : "User added: " + newName);
    }
};



// --- 7. BACKUP SYSTEM ---
function exportFullData() {
    const backup = { profile: userProfile, history: workoutHistory };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `ARV_BACKUP.json`);
    dl.click();
}

window.exportProfile = exportFullData;

window.deleteCurrentProfile = function() {
    const select = $("user-selector");
    const userToDelete = select.value;

    let users = JSON.parse(localStorage.getItem("gym_users")) || ['CezArv'];
        if (users.length <=1) {
            alert(currentLang === 'pl' ? "Nie mozesz usunac ostatniego profilu!" : "Cannot delete the last remaining profile!");
            return;
        }
        const confirmMsg = currentLang === 'pl' ? `Czy na pewno usunac profil? : ${userToDelete} ?` : `Delete profile: ${userToDelete}?`;
            if (confirm(confirmMsg)) {
                // Scalpel precision for only one 
                users = users.filter(u => u !== userToDelete);
                localStorage.setItem('gym_users', JSON.stringify(users));
                // cleansing all data from history only this user
                workoutHistory = workoutHistory.filter(h => h.user !== userToDelete);
                localStorage.setItem('workoutLogs', JSON.stringify(workoutHistory));
                    alert(currentLang === 'pl' ? "Profil i jego dane usuniete" : "Profile and data deleted.");
                    location.reload();
            }
};
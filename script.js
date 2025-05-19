// Main JavaScript functionality for the GRE Word Memorizer app

// Global variables
let currentGroup = "Group 1";
let selectedWordIndex = -1;
let groups = Object.keys(wordData);
let currentWords = [...wordData[currentGroup]];
let userProgress = {};
let inMixedMode = false; // Track if we're in mixed mode
let userNotes = {}; // Store user notes for words

// DOM elements
const wordContainer = document.getElementById("wordContainer");
const groupSelector = document.getElementById("groupSelector");
const groupDropdown = document.getElementById("groupDropdown");
const modal = document.getElementById("wordModal");
const modalWord = document.getElementById("modalWord");
const modalDefinition = document.getElementById("modalDefinition");
const modalExample = document.getElementById("modalExample");
const modalSynonyms = document.getElementById("modalSynonyms");
const closeModal = document.querySelector(".close");

// Initialize the app
function initializeApp() {
    loadUserProgress();
    loadUserNotes(); // Load notes from localStorage
    populateGroupDropdown();
    displayWords(currentGroup);
    updateGroupStats(); // Add statistics display
    createTouchControls(); // Add touch-friendly controls
    setupEventListeners();
}

// Load user notes from local storage
function loadUserNotes() {
    const savedNotes = localStorage.getItem("greWordNotes");
    if (savedNotes) {
        userNotes = JSON.parse(savedNotes);
    }
}

// Save user notes to local storage
function saveUserNotes() {
    localStorage.setItem("greWordNotes", JSON.stringify(userNotes));
}

// Create touch-friendly controls for mobile/tablet users
function createTouchControls() {
    // Create a container for the touch controls
    const touchControls = document.createElement("div");
    touchControls.className = "touch-controls";

    // Create buttons for each keyboard shortcut
    const buttonData = [
        {
            key: "G",
            label: "Known",
            class: "green-btn",
            action: () => markWord("green"),
        },
        {
            key: "R",
            label: "Learning",
            class: "red-btn",
            action: () => markWord("red"),
        },
        {
            key: "W",
            label: "New",
            class: "white-btn",
            action: () => markWord("white"),
        },
        { key: "S", label: "Speak", class: "speak-btn", action: () => speakWord() },
        {
            key: "D",
            label: "Details",
            class: "details-btn",
            action: () => {
                if (selectedWordIndex !== -1) {
                    showWordDetails(currentWords[selectedWordIndex]);
                }
            },
        },
    ];

    // Create each button and add it to the container
    buttonData.forEach((button) => {
        const btn = document.createElement("button");
        btn.className = `touch-btn ${button.class}`;
        btn.innerHTML = `${button.label} <span class="key-hint">${button.key}</span>`;
        btn.addEventListener("click", button.action);
        touchControls.appendChild(btn);
    });

    // Add navigation buttons
    const prevBtn = document.createElement("button");
    prevBtn.className = "touch-btn nav-btn prev-btn";
    prevBtn.innerHTML = "&larr; Prev";
    prevBtn.addEventListener("click", navigatePrevious);

    const nextBtn = document.createElement("button");
    nextBtn.className = "touch-btn nav-btn next-btn";
    nextBtn.innerHTML = "Next &rarr;";
    nextBtn.addEventListener("click", navigateNext);

    // Add navigation buttons at the beginning and end
    touchControls.insertBefore(prevBtn, touchControls.firstChild);
    touchControls.appendChild(nextBtn);

    // Insert the touch controls after the header
    const header = document.querySelector("header");
    header.parentNode.insertBefore(touchControls, header.nextSibling);
}

// Load user progress from local storage
function loadUserProgress() {
    const savedProgress = localStorage.getItem("greWordProgress");
    if (savedProgress) {
        userProgress = JSON.parse(savedProgress);

        // Ensure all groups and words have progress entries
        initializeAllGroupsProgress();
    } else {
        // Initialize empty progress for each group
        initializeAllGroupsProgress();
    }
}

// Initialize progress for all groups and words
function initializeAllGroupsProgress() {
    groups.forEach((group) => {
        if (!userProgress[group]) {
            userProgress[group] = {};
        }

        // Make sure every word has a status
        wordData[group].forEach((word) => {
            if (!userProgress[group][word.word]) {
                userProgress[group][word.word] = { status: "white" };
            }
        });
    });
}

// Save user progress to local storage
function saveUserProgress() {
    localStorage.setItem("greWordProgress", JSON.stringify(userProgress));
}

// Populate the group dropdown menu
function populateGroupDropdown() {
    groupDropdown.innerHTML = "";
    groups.forEach((group) => {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = group;
        link.addEventListener("click", () => {
            changeGroup(group);
        });
        groupDropdown.appendChild(link);
    });
}

// Change the current group
function changeGroup(group) {
    currentGroup = group;
    groupSelector.textContent = group;
    currentWords = [...wordData[group]];
    selectedWordIndex = -1;
    inMixedMode = false; // Reset mixed mode when changing groups

    // Ensure all words in this group have a progress entry
    if (!userProgress[group]) {
        userProgress[group] = {};
    }

    wordData[group].forEach((wordObj) => {
        if (!userProgress[group][wordObj.word]) {
            userProgress[group][wordObj.word] = { status: "white" };
        }
    });

    displayWords(group);
    updateGroupStats(); // Update statistics when changing groups
}

// Display words for the selected group
function displayWords(group) {
    wordContainer.innerHTML = "";

    currentWords.forEach((wordObj, index) => {
        const wordCard = document.createElement("div");
        wordCard.className = "word-card";

        // Find which group this word belongs to
        let wordGroup = group;
        if (inMixedMode) {
            for (const g of groups) {
                if (wordData[g].some((w) => w.word === wordObj.word)) {
                    wordGroup = g;
                    break;
                }
            }
        }

        // Apply saved status if available
        if (userProgress[wordGroup] && userProgress[wordGroup][wordObj.word]) {
            const status = userProgress[wordGroup][wordObj.word].status;
            if (status) {
                wordCard.classList.add(status);
            }
        }

        wordCard.dataset.index = index;
        wordCard.dataset.word = wordObj.word;
        wordCard.dataset.group = wordGroup;

        const wordText = document.createElement("div");
        wordText.className = "word-text";
        wordText.textContent = wordObj.word;

        // Add note indicator dot if word has notes
        if (hasNotes(wordGroup, wordObj.word)) {
            const noteDot = document.createElement("span");
            noteDot.className = "note-indicator";
            wordText.appendChild(noteDot);
        }

        wordCard.appendChild(wordText);

        // Single event listener for clicks with special logic
        wordCard.addEventListener("click", function (event) {
            // If the word is already selected, show details on single click
            if (selectedWordIndex === index) {
                showWordDetails(wordObj);
            } else {
                // If word is not selected, select it
                selectWord(index);
            }
        });

        wordContainer.appendChild(wordCard);
    });
}

// Check if a word has notes
function hasNotes(group, word) {
    return (
        userNotes[group] &&
        userNotes[group][word] &&
        userNotes[group][word].trim() !== ""
    );
}

// Select a word and make it active
function selectWord(index) {
    // Remove selection from previously selected word
    const previouslySelected = document.querySelector(".word-card.selected");
    if (previouslySelected) {
        previouslySelected.classList.remove("selected");
    }

    selectedWordIndex = index;

    // Add selection to newly selected word
    const selectedCard = document.querySelector(
        `.word-card[data-index="${index}"]`
    );
    if (selectedCard) {
        selectedCard.classList.add("selected");

        // Add this line to scroll the selected word into view
        selectedCard.scrollIntoView({ behavior: "smooth", block: "nearest" });

        // Add a quick animation to make selection more noticeable
        selectedCard.classList.add("pulse-animation");
        setTimeout(() => {
            selectedCard.classList.remove("pulse-animation");
        }, 500);
    }
}

// Show word details in the modal
function showWordDetails(wordObj) {
    modalWord.textContent = wordObj.word;
    modalDefinition.textContent = wordObj.definition;
    modalExample.textContent = wordObj.example;
    modalSynonyms.textContent = `Synonyms: ${wordObj.synonyms}`;

    // Check if modal controls already exist
    let modalControls = document.getElementById("modalControls");

    // If they don't exist, create them
    if (!modalControls) {
        modalControls = document.createElement("div");
        modalControls.id = "modalControls";
        modalControls.className = "modal-controls";

        // Create navigation buttons as part of the controls (to keep them in the same row)
        const prevBtn = document.createElement("button");
        prevBtn.className = "modal-btn nav-btn prev-btn";
        prevBtn.innerHTML = "&larr;";
        prevBtn.addEventListener("click", () => {
            if (selectedWordIndex > 0) {
                const newIndex = selectedWordIndex - 1;
                selectWord(newIndex);
                showWordDetails(currentWords[newIndex]);
            }
        });

        // Create marking buttons - simplified to just letters
        const markingButtons = [
            { key: "G", class: "green-btn", action: "green" },
            { key: "R", class: "red-btn", action: "red" },
            { key: "W", class: "white-btn", action: "white" },
            { key: "S", class: "speak-btn", action: "speak" },
        ];

        // Add previous button first
        modalControls.appendChild(prevBtn);

        // Add the other action buttons
        markingButtons.forEach((button) => {
            const btn = document.createElement("button");
            btn.className = `modal-btn ${button.class}`;
            btn.textContent = button.key;

            if (button.action === "speak") {
                btn.addEventListener("click", speakWord);
            } else {
                btn.addEventListener("click", () => {
                    markWord(button.action);
                });
            }

            modalControls.appendChild(btn);
        });

        // Next word button
        const nextBtn = document.createElement("button");
        nextBtn.className = "modal-btn nav-btn next-btn";
        nextBtn.innerHTML = "&rarr;";
        nextBtn.addEventListener("click", () => {
            if (selectedWordIndex < currentWords.length - 1) {
                const newIndex = selectedWordIndex + 1;
                selectWord(newIndex);
                showWordDetails(currentWords[newIndex]);
            }
        });

        // Add next button at the end
        modalControls.appendChild(nextBtn);

        // Add to modal content
        document.querySelector(".modal-content").appendChild(modalControls);
    }

    // Feature #2: Add notes section
    let notesSection = document.getElementById("modalNotes");
    if (!notesSection) {
        notesSection = document.createElement("div");
        notesSection.id = "modalNotes";
        notesSection.className = "modal-notes";

        const notesTitle = document.createElement("h3");
        notesTitle.textContent = "Your Notes:";

        const notesTextarea = document.createElement("textarea");
        notesTextarea.id = "userNotesInput";
        notesTextarea.className = "user-notes-input";
        notesTextarea.placeholder =
            "Add your personal notes about this word here...";

        notesSection.appendChild(notesTitle);
        notesSection.appendChild(notesTextarea);

        // Add to modal content
        document.querySelector(".modal-content").appendChild(notesSection);
    }

    // Get the correct group for this word
    const wordGroup =
        document.querySelector(`.word-card[data-index="${selectedWordIndex}"]`)
            ?.dataset.group || currentGroup;
    const wordText = wordObj.word;

    // Update the notes textarea with any existing notes
    const notesTextarea = document.getElementById("userNotesInput");
    if (userNotes[wordGroup] && userNotes[wordGroup][wordText]) {
        notesTextarea.value = userNotes[wordGroup][wordText];
    } else {
        notesTextarea.value = "";
    }

    // Remove any existing event listeners to prevent multiple listeners
    const newTextarea = notesTextarea.cloneNode(true);
    notesTextarea.parentNode.replaceChild(newTextarea, notesTextarea);

    // Add fresh event listener
    newTextarea.addEventListener("input", () => {
        // Store current word and group for closure
        const currentWordText = wordObj.word;
        const currentWordGroup = wordGroup;

        // Initialize objects for group and word if they don't exist
        if (!userNotes[currentWordGroup]) {
            userNotes[currentWordGroup] = {};
        }

        // Save the note text
        userNotes[currentWordGroup][currentWordText] = newTextarea.value;
        saveUserNotes();

        // Update the note indicator dot
        updateNoteIndicator(currentWordGroup, currentWordText, newTextarea.value);
    });

    modal.style.display = "flex";
}

// Update the note indicator for a word
function updateNoteIndicator(group, word, noteText) {
    // Find the word card for this word
    const wordCards = document.querySelectorAll(
        `.word-card[data-word="${word}"][data-group="${group}"]`
    );

    wordCards.forEach((card) => {
        // Check if the note is empty or not
        const hasNote = noteText && noteText.trim() !== "";

        // Find existing dot or create a new one if needed
        let noteDot = card.querySelector(".note-indicator");

        if (hasNote) {
            // Add dot if it doesn't exist
            if (!noteDot) {
                noteDot = document.createElement("span");
                noteDot.className = "note-indicator";
                card.querySelector(".word-text").appendChild(noteDot);
            }
        } else {
            // Remove dot if it exists and note is empty
            if (noteDot) {
                noteDot.remove();
            }
        }
    });
}

// Mark a word with a specific status
function markWord(status) {
    if (selectedWordIndex === -1) return;

    const wordObj = currentWords[selectedWordIndex];
    const selectedCard = document.querySelector(
        `.word-card[data-index="${selectedWordIndex}"]`
    );

    if (selectedCard) {
        // Remove existing status classes
        selectedCard.classList.remove("green", "red", "white");

        // Add new status class
        selectedCard.classList.add(status);

        // Determine the correct group for this word
        let wordGroup = currentGroup;
        if (inMixedMode) {
            wordGroup = selectedCard.dataset.group;
        }

        // Update user progress
        if (!userProgress[wordGroup]) {
            userProgress[wordGroup] = {};
        }

        userProgress[wordGroup][wordObj.word] = { status };
        saveUserProgress();
        updateGroupStats(); // Update statistics when marking a word
    }
}

// Speak the word using speech synthesis
function speakWord() {
    if (selectedWordIndex === -1) return;

    const wordObj = currentWords[selectedWordIndex];
    const utterance = new SpeechSynthesisUtterance(wordObj.word);
    speechSynthesis.speak(utterance);
}

// Shuffle words within the current group
function shuffleCurrentGroup() {
    // Feature #5: Shuffle all words in the current view (single group or mixed groups)
    currentWords = [...currentWords].sort(() => Math.random() - 0.5);
    displayWords(currentGroup);
    updateGroupStats(); // Update statistics after shuffling
}

// Feature #4: Bring multiple groups together sequentially instead of shuffling
function bringMultipleGroups() {
    // Find the current group index
    const currentGroupIndex = groups.indexOf(currentGroup);
    let allWords = [];

    // Collect words from groups up to the current one SEQUENTIALLY (not shuffled)
    for (let i = 0; i <= currentGroupIndex; i++) {
        allWords = allWords.concat(wordData[groups[i]]);
    }

    // Set the current words to all collected words (without shuffling)
    currentWords = [...allWords];

    // Set mixed mode flag
    inMixedMode = true;

    // Update UI to show we're in a special mode
    groupSelector.textContent = `Groups 1-${currentGroupIndex + 1}`;

    // Display the words
    displayWords(currentGroup);

    // Update stats for mixed mode
    updateGroupStats();
}

// Reset the shuffle and go back to original order
function resetShuffle() {
    // Feature #6: Reset to original order (either single group or sequential mixed groups)
    if (inMixedMode) {
        // If in mixed mode, collect words from all groups up to current one in order
        const currentGroupIndex = groups.indexOf(currentGroup);
        let allWords = [];

        for (let i = 0; i <= currentGroupIndex; i++) {
            allWords = allWords.concat(wordData[groups[i]]);
        }

        currentWords = [...allWords];
    } else {
        // If not in mixed mode, just reset the current group
        currentWords = [...wordData[currentGroup]];
    }

    displayWords(currentGroup);
    updateGroupStats(); // Update statistics after reset
}

// Reset ALL marking in ALL groups
function resetAllMarking() {
    // Reset ALL groups regardless of current mode
    groups.forEach((group) => {
        if (wordData[group]) {
            wordData[group].forEach((word) => {
                if (!userProgress[group]) {
                    userProgress[group] = {};
                }
                userProgress[group][word.word] = { status: "white" };
            });
        }
    });

    saveUserProgress();
    displayWords(currentGroup);
    updateGroupStats(); // Update statistics when resetting marking
}

// Reset marking for the current day/group
function resetCurrentDay() {
    // Reset only the current group
    const words = wordData[currentGroup];

    // Reset user progress for current group
    words.forEach((word) => {
        if (!userProgress[currentGroup]) {
            userProgress[currentGroup] = {};
        }
        userProgress[currentGroup][word.word] = { status: "white" };
    });

    saveUserProgress();
    displayWords(currentGroup);
    updateGroupStats(); // Update statistics when resetting current day
}

// Navigate to the next word
function navigateNext() {
    if (selectedWordIndex < currentWords.length - 1) {
        selectWord(selectedWordIndex + 1);
    }
}

// Navigate to the previous word
function navigatePrevious() {
    if (selectedWordIndex > 0) {
        selectWord(selectedWordIndex - 1);
    }
}

// Calculate and display group statistics - Fixed Bug #1 and #2
function updateGroupStats() {
    // First check if stats element exists, if not create it
    let statsElement = document.getElementById("groupStats");
    if (!statsElement) {
        statsElement = document.createElement("div");
        statsElement.id = "groupStats";
        statsElement.className = "group-stats";

        // Insert it after the instructions div
        const instructions = document.querySelector(".instructions");
        instructions.parentNode.insertBefore(
            statsElement,
            instructions.nextSibling
        );
    }

    // Initialize stats object
    const stats = { green: 0, red: 0, white: 0, total: 0 };

    // Bug fix #1 & #2: Count stats properly based on word cards currently displayed
    // Instead of trying to track groups, just count what's visible in the UI
    const wordCards = document.querySelectorAll(".word-card");

    // Count total words displayed (fix for Bug #2)
    stats.total = wordCards.length;

    // Count status for each displayed word
    wordCards.forEach((card) => {
        if (card.classList.contains("green")) {
            stats.green++;
        } else if (card.classList.contains("red")) {
            stats.red++;
        } else {
            stats.white++;
        }
    });

    // Create stats HTML
    statsElement.innerHTML = `
        <div class="stat-item green-stat">Known: ${stats.green}</div>
        <div class="stat-item red-stat">Learning: ${stats.red}</div>
        <div class="stat-item white-stat">New: ${stats.white}</div>
        <div class="stat-item total-stat">Total: ${stats.total}</div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    // Close modal when clicking the X
    closeModal.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Close modal when clicking outside of it
    window.addEventListener("click", (event) => {
        // Check if the click is on the modal background (not on modal content)
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    // Button event listeners
    document
        .getElementById("shuffleGroup")
        .addEventListener("click", shuffleCurrentGroup);

    // Feature #4: Change "Shuffle Multiple Groups" to "Bring Multiple Groups"
    const shuffleMultipleBtn = document.getElementById("shuffleMultiple");
    shuffleMultipleBtn.textContent = "Bring Multiple Groups";
    shuffleMultipleBtn.addEventListener("click", bringMultipleGroups);

    document
        .getElementById("resetShuffle")
        .addEventListener("click", resetShuffle);
    document
        .getElementById("resetMarking")
        .addEventListener("click", resetAllMarking);
    document
        .getElementById("resetDay")
        .addEventListener("click", resetCurrentDay);

    // Keyboard shortcuts
    document.addEventListener("keydown", (event) => {
        // Ignore keyboard shortcuts when typing in an input field
        if (
            event.target.tagName === "INPUT" ||
            event.target.tagName === "TEXTAREA"
        ) {
            return;
        }

        switch (event.key.toLowerCase()) {
            case "arrowleft":
                navigatePrevious();
                break;
            case "arrowright":
                navigateNext();
                break;
            case "g":
                markWord("green");
                break;
            case "r":
                markWord("red");
                break;
            case "w":
                markWord("white");
                break;
            case "s":
                speakWord();
                break;
            case "d":
                if (modal.style.display === "block") {
                    // Close modal if it's open
                    modal.style.display = "none";
                } else if (selectedWordIndex !== -1) {
                    // Show details if modal is closed and a word is selected
                    showWordDetails(currentWords[selectedWordIndex]);
                }
                break;
            case "escape":
                // Close modal with Escape key
                if (modal.style.display === "block") {
                    modal.style.display = "none";
                }
                break;
        }
    });
}

// Initialize the app when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializeApp);

// ── State ──────────────────────────────────────────────────────────────────

let array = [];
let sorting = false;
let paused = false;
let stopRequested = false;
let comparisons = 0;
let arrayAccesses = 0;
let startTime = 0;
let pausedAt = 0;
let totalPausedMs = 0;
let timerInterval;

// ── Algorithm Metadata ─────────────────────────────────────────────────────

const algorithmInfo = {
    bubble: {
        name: "Bubble Sort",
        description: "Bubble Sort repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order.",
        timeComplexity: "O(n²)",
        spaceComplexity: "O(1)"
    },
    selection: {
        name: "Selection Sort",
        description: "Selection Sort divides the array into a sorted and unsorted region. It repeatedly selects the smallest element from the unsorted region.",
        timeComplexity: "O(n²)",
        spaceComplexity: "O(1)"
    },
    insertion: {
        name: "Insertion Sort",
        description: "Insertion Sort builds the final sorted array one item at a time. It takes each element and inserts it into its correct position.",
        timeComplexity: "O(n²)",
        spaceComplexity: "O(1)"
    },
    merge: {
        name: "Merge Sort",
        description: "Merge Sort is a divide-and-conquer algorithm that divides the array into two halves, recursively sorts them, and merges them back.",
        timeComplexity: "O(n log n)",
        spaceComplexity: "O(n)"
    },
    quick: {
        name: "Quick Sort",
        description: "Quick Sort picks a 'pivot' element and partitions the array around it, placing smaller elements before and larger after.",
        timeComplexity: "O(n log n) avg",
        spaceComplexity: "O(log n)"
    },
    heap: {
        name: "Heap Sort",
        description: "Heap Sort builds a max heap from the array, then repeatedly extracts the maximum element and rebuilds the heap.",
        timeComplexity: "O(n log n)",
        spaceComplexity: "O(1)"
    }
};

// ── DOM References ─────────────────────────────────────────────────────────

const visualizer      = document.getElementById('visualizer');
const sortBtn         = document.getElementById('sortBtn');
const pauseBtn        = document.getElementById('pauseBtn');
const resetBtn        = document.getElementById('resetBtn');
const newArrayBtn     = document.getElementById('newArrayBtn');
const algorithmSelect = document.getElementById('algorithm');
const arraySizeSlider = document.getElementById('arraySize');
const speedSlider     = document.getElementById('speed');
const arraySizeValue  = document.getElementById('arraySizeValue');
const speedValue      = document.getElementById('speedValue');
const comparisonsEl   = document.getElementById('comparisons');
const arrayAccessesEl = document.getElementById('arrayAccesses');
const timeElapsedEl   = document.getElementById('timeElapsed');
const infoPanel       = document.getElementById('infoPanel');

// ── Init ───────────────────────────────────────────────────────────────────

function init() {
    generateNewArray();
    updateAlgorithmInfo();
}

sortBtn.addEventListener('click', startSort);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', reset);
newArrayBtn.addEventListener('click', generateNewArray);
algorithmSelect.addEventListener('change', updateAlgorithmInfo);

arraySizeSlider.addEventListener('input', (e) => {
    arraySizeValue.textContent = e.target.value;
    if (!sorting) generateNewArray();
});

speedSlider.addEventListener('input', (e) => {
    speedValue.textContent = `${101 - e.target.value}ms`;
});

// ── Array Generation & Rendering ──────────────────────────────────────────

function generateNewArray() {
    const size = parseInt(arraySizeSlider.value);
    array = [];
    for (let i = 0; i < size; i++) {
        array.push(Math.floor(Math.random() * 100) + 1);
    }
    resetStats();
    renderArray();
}

function renderArray(highlightIndices = {}) {
    visualizer.innerHTML = '';
    const maxValue = Math.max(...array);

    array.forEach((value, index) => {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = (value / maxValue * 100) + '%';

        if (highlightIndices.comparing && highlightIndices.comparing.includes(index)) {
            bar.classList.add('comparing');
        }
        if (highlightIndices.swapping && highlightIndices.swapping.includes(index)) {
            bar.classList.add('swapping');
        }
        // sorted is a Set so the green wave accumulates across frames
        if (highlightIndices.sorted && highlightIndices.sorted.has(index)) {
            bar.classList.add('sorted');
        }

        visualizer.appendChild(bar);
    });
}

// ── UI Updates ─────────────────────────────────────────────────────────────

function updateAlgorithmInfo() {
    const algo = algorithmSelect.value;
    const info = algorithmInfo[algo];
    infoPanel.innerHTML = `
        <h2>About ${info.name}</h2>
        <p><span class="complexity">Time: ${info.timeComplexity}</span><span class="complexity">Space: ${info.spaceComplexity}</span></p>
        <p>${info.description}</p>
    `;
}

function resetStats() {
    comparisons = 0;
    arrayAccesses = 0;
    comparisonsEl.textContent = '0';
    arrayAccessesEl.textContent = '0';
    timeElapsedEl.textContent = '0.0s';
    if (timerInterval) clearInterval(timerInterval);
}

function incrementComparisons() {
    comparisons++;
    comparisonsEl.textContent = comparisons;
}

function incrementArrayAccesses(count = 1) {
    arrayAccesses += count;
    arrayAccessesEl.textContent = arrayAccesses;
}

// ── Timer ──────────────────────────────────────────────────────────────────

function startTimer() {
    startTime = Date.now();
    totalPausedMs = 0;
    pausedAt = 0;
    timerInterval = setInterval(() => {
        // Subtract accumulated pause duration so the clock freezes while paused
        const elapsed = ((Date.now() - startTime - totalPausedMs) / 1000).toFixed(1);
        timeElapsedEl.textContent = `${elapsed}s`;
    }, 100);
}

// ── Sort Control ───────────────────────────────────────────────────────────

async function startSort() {
    if (sorting) return;

    sorting = true;
    stopRequested = false;
    paused = false;
    resetStats();
    startTimer();

    sortBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
    newArrayBtn.disabled = true;
    algorithmSelect.disabled = true;
    arraySizeSlider.disabled = true;

    try {
        switch (algorithmSelect.value) {
            case 'bubble':    await bubbleSort();                        break;
            case 'selection': await selectionSort();                     break;
            case 'insertion': await insertionSort();                     break;
            case 'merge':     await mergeSort(0, array.length - 1);     break;
            case 'quick':     await quickSort(0, array.length - 1);     break;
            case 'heap':      await heapSort();                          break;
        }

        if (!stopRequested) {
            await showSortedAnimation();
        }
    } catch (error) {
        console.error('Sorting error:', error);
    }

    endSort();
}

function togglePause() {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    if (paused) {
        pausedAt = Date.now();
    } else {
        totalPausedMs += Date.now() - pausedAt;
    }
}

function reset() {
    stopRequested = true;
    paused = false;   // unblock waitIfPaused so the async loop can exit
    endSort();
    renderArray();
}

function endSort() {
    sorting = false;
    // Keep stopRequested true so any still-running async iterations can bail cleanly;
    // it is reset to false at the top of the next startSort() call.
    paused = false;

    sortBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = 'Pause';
    newArrayBtn.disabled = false;
    algorithmSelect.disabled = false;
    arraySizeSlider.disabled = false;

    if (timerInterval) clearInterval(timerInterval);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getDelay() {
    return 101 - parseInt(speedSlider.value);
}

async function waitIfPaused() {
    while (paused && !stopRequested) {
        await sleep(100);
    }
}

async function showSortedAnimation() {
    const sortedSet = new Set();
    for (let i = 0; i < array.length; i++) {
        if (stopRequested) break;
        sortedSet.add(i);
        renderArray({ sorted: sortedSet });
        await sleep(20);
    }
}

// ── Sorting Algorithms ─────────────────────────────────────────────────────

async function bubbleSort() {
    const n = array.length;
    for (let i = 0; i < n - 1; i++) {
        if (stopRequested) break;
        for (let j = 0; j < n - i - 1; j++) {
            if (stopRequested) break;
            await waitIfPaused();

            incrementComparisons();
            incrementArrayAccesses(2);
            renderArray({ comparing: [j, j + 1] });
            await sleep(getDelay());

            if (array[j] > array[j + 1]) {
                renderArray({ swapping: [j, j + 1] });
                await sleep(getDelay());

                [array[j], array[j + 1]] = [array[j + 1], array[j]];
                incrementArrayAccesses(4);
                renderArray();
            }
        }
    }
}

async function selectionSort() {
    const n = array.length;
    for (let i = 0; i < n - 1; i++) {
        if (stopRequested) break;
        let minIdx = i;

        for (let j = i + 1; j < n; j++) {
            if (stopRequested) break;
            await waitIfPaused();

            incrementComparisons();
            incrementArrayAccesses(2);
            renderArray({ comparing: [minIdx, j] });
            await sleep(getDelay());

            if (array[j] < array[minIdx]) {
                minIdx = j;
            }
        }

        if (minIdx !== i) {
            renderArray({ swapping: [i, minIdx] });
            await sleep(getDelay());

            [array[i], array[minIdx]] = [array[minIdx], array[i]];
            incrementArrayAccesses(4);
            renderArray();
        }
    }
}

async function insertionSort() {
    const n = array.length;
    for (let i = 1; i < n; i++) {
        if (stopRequested) break;
        let key = array[i];
        let j = i - 1;
        incrementArrayAccesses(1);

        while (j >= 0 && array[j] > key) {
            if (stopRequested) break;
            await waitIfPaused();

            incrementComparisons();
            incrementArrayAccesses(2);
            renderArray({ comparing: [j, j + 1] });
            await sleep(getDelay());

            array[j + 1] = array[j];
            incrementArrayAccesses(2);
            j--;
            renderArray();
        }

        array[j + 1] = key;
        incrementArrayAccesses(1);
        renderArray();
    }
}

async function mergeSort(left, right) {
    if (left >= right || stopRequested) return;

    const mid = Math.floor((left + right) / 2);
    await mergeSort(left, mid);
    await mergeSort(mid + 1, right);
    await merge(left, mid, right);
}

async function merge(left, mid, right) {
    const leftArr = array.slice(left, mid + 1);
    const rightArr = array.slice(mid + 1, right + 1);
    incrementArrayAccesses(right - left + 1);

    let i = 0, j = 0, k = left;

    while (i < leftArr.length && j < rightArr.length) {
        if (stopRequested) break;
        await waitIfPaused();

        incrementComparisons();
        renderArray({ comparing: [k] });
        await sleep(getDelay());

        if (leftArr[i] <= rightArr[j]) {
            array[k] = leftArr[i];
            i++;
        } else {
            array[k] = rightArr[j];
            j++;
        }
        incrementArrayAccesses(1);
        k++;
        renderArray();
    }

    while (i < leftArr.length) {
        if (stopRequested) break;
        array[k] = leftArr[i];
        incrementArrayAccesses(1);
        i++; k++;
    }

    while (j < rightArr.length) {
        if (stopRequested) break;
        array[k] = rightArr[j];
        incrementArrayAccesses(1);
        j++; k++;
    }
}

async function quickSort(low, high) {
    if (low < high && !stopRequested) {
        const pi = await partition(low, high);
        await quickSort(low, pi - 1);
        await quickSort(pi + 1, high);
    }
}

async function partition(low, high) {
    const pivot = array[high];
    incrementArrayAccesses(1);
    let i = low - 1;

    for (let j = low; j < high; j++) {
        if (stopRequested) break;
        await waitIfPaused();

        incrementComparisons();
        incrementArrayAccesses(1);
        renderArray({ comparing: [j, high] });
        await sleep(getDelay());

        if (array[j] < pivot) {
            i++;
            if (i !== j) {
                renderArray({ swapping: [i, j] });
                await sleep(getDelay());

                [array[i], array[j]] = [array[j], array[i]];
                incrementArrayAccesses(4);
                renderArray();
            }
        }
    }

    if (i + 1 !== high) {
        renderArray({ swapping: [i + 1, high] });
        await sleep(getDelay());

        [array[i + 1], array[high]] = [array[high], array[i + 1]];
        incrementArrayAccesses(4);
        renderArray();
    }

    return i + 1;
}

async function heapSort() {
    const n = array.length;

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        if (stopRequested) break;
        await heapify(n, i);
    }

    for (let i = n - 1; i > 0; i--) {
        if (stopRequested) break;

        renderArray({ swapping: [0, i] });
        await sleep(getDelay());

        [array[0], array[i]] = [array[i], array[0]];
        incrementArrayAccesses(4);
        renderArray();

        await heapify(i, 0);
    }
}

async function heapify(n, i) {
    let largest = i;
    const left  = 2 * i + 1;
    const right = 2 * i + 2;

    if (left < n) {
        incrementComparisons();
        incrementArrayAccesses(2);
        if (array[left] > array[largest]) largest = left;
    }

    if (right < n) {
        incrementComparisons();
        incrementArrayAccesses(2);
        if (array[right] > array[largest]) largest = right;
    }

    if (largest !== i) {
        await waitIfPaused();
        renderArray({ swapping: [i, largest] });
        await sleep(getDelay());

        [array[i], array[largest]] = [array[largest], array[i]];
        incrementArrayAccesses(4);
        renderArray();

        await heapify(n, largest);
    }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

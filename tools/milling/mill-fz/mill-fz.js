document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculate-btn');
    const fzInput = document.getElementById('fz');
    const vfInput = document.getElementById('vf');
    const nInput = document.getElementById('n');
    const zInput = document.getElementById('z');
    const calcFzRadio = document.getElementById('calc-fz');
    const calcVfRadio = document.getElementById('calc-vf');
    const calcNRadio = document.getElementById('calc-n');
    const calcZRadio = document.getElementById('calc-z');
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-message';
    document.querySelector('.calculator-content').appendChild(resultDiv);

    // Add onclick event to auto-highlight content
    [fzInput, vfInput, nInput, zInput].forEach(input => {
        input.onclick = function() {
            this.select();
        };
    });

    function updateInputStates() {
        fzInput.disabled = calcFzRadio.checked;
        vfInput.disabled = calcVfRadio.checked;
        nInput.disabled = calcNRadio.checked;
        zInput.disabled = calcZRadio.checked;
        fzInput.style.backgroundColor = '';
        vfInput.style.backgroundColor = '';
        nInput.style.backgroundColor = '';
        zInput.style.backgroundColor = '';
        resultDiv.textContent = '';
    }

    calculateBtn.addEventListener('click', calculate);
    [calcFzRadio, calcVfRadio, calcNRadio, calcZRadio].forEach(radio => {
        radio.addEventListener('change', updateInputStates);
    });
    updateInputStates();

    [fzInput, vfInput, nInput, zInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });

    function calculate() {
        resultDiv.textContent = '';
        fzInput.style.backgroundColor = '';
        vfInput.style.backgroundColor = '';
        nInput.style.backgroundColor = '';
        zInput.style.backgroundColor = '';

        const fz = parseFloat(fzInput.value.replace(/,/g, '')) || 0;
        const vf = parseFloat(vfInput.value.replace(/,/g, '')) || 0;
        const n = parseFloat(nInput.value.replace(/,/g, '')) || 0;
        const z = parseFloat(zInput.value.replace(/,/g, '')) || 0;

        if (!calcFzRadio.checked && fz <= 0) {
            showError('All values must be positive numbers', fzInput);
            return;
        }
        if (!calcVfRadio.checked && vf <= 0) {
            showError('All values must be positive numbers', vfInput);
            return;
        }
        if (!calcNRadio.checked && n <= 0) {
            showError('All values must be positive numbers', nInput);
            return;
        }
        if (!calcZRadio.checked && z <= 0) {
            showError('All values must be positive numbers', zInput);
            return;
        }

        if (calcFzRadio.checked) {
            const calculatedFz = vf / (n * z);
            if (isNaN(calculatedFz) || calculatedFz <= 0) {
                showError('Invalid calculation: resulting fz is not positive', fzInput);
                return;
            }
            fzInput.value = calculatedFz.toFixed(6);
        } else if (calcVfRadio.checked) {
            const calculatedVf = fz * n * z;
            if (isNaN(calculatedVf) || calculatedVf <= 0) {
                showError('Invalid calculation: resulting vf is not positive', vfInput);
                return;
            }
            vfInput.value = Math.round(calculatedVf);
        } else if (calcNRadio.checked) {
            const calculatedN = vf / (fz * z);
            if (isNaN(calculatedN) || calculatedN <= 0) {
                showError('Invalid calculation: resulting n is not positive', nInput);
                return;
            }
            nInput.value = Math.round(calculatedN);
        } else if (calcZRadio.checked) {
            const calculatedZ = vf / (fz * n);
            if (isNaN(calculatedZ) || calculatedZ <= 1) {
                showError('Invalid calculation: resulting z must be greater than 1', zInput);
                return;
            }
            zInput.value = Math.ceil(calculatedZ);
        }
    }

    function showError(message, inputElement) {
        resultDiv.textContent = message;
        resultDiv.style.color = 'red';
        if (inputElement) {
            inputElement.style.backgroundColor = '#e84855';
        }
    }
});

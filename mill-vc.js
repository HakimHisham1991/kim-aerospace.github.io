document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculate-btn');
    const vcInput = document.getElementById('vc');
    const dInput = document.getElementById('d');
    const nInput = document.getElementById('n');
    const calcVcRadio = document.getElementById('calc-vc');
    const calcDRadio = document.getElementById('calc-d');
    const calcNRadio = document.getElementById('calc-n');
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-message';
    document.querySelector('.calculator-content').appendChild(resultDiv);

    // Add onclick event to auto-highlight content
    [vcInput, dInput, nInput].forEach(input => {
        input.onclick = function() {
            this.select();
        };
    });

    function updateInputStates() {
        vcInput.disabled = calcVcRadio.checked;
        dInput.disabled = calcDRadio.checked;
        nInput.disabled = calcNRadio.checked;
        vcInput.style.backgroundColor = '';
        dInput.style.backgroundColor = '';
        nInput.style.backgroundColor = '';
        resultDiv.textContent = '';
    }

    calculateBtn.addEventListener('click', calculate);
    [calcVcRadio, calcDRadio, calcNRadio].forEach(radio => {
        radio.addEventListener('change', updateInputStates);
    });
    updateInputStates();

    [vcInput, dInput, nInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });

    function calculate() {
        resultDiv.textContent = '';
        vcInput.style.backgroundColor = '';
        dInput.style.backgroundColor = '';
        nInput.style.backgroundColor = '';

        const vc = parseFloat(vcInput.value.replace(/,/g, '')) || 0;
        const d = parseFloat(dInput.value.replace(/,/g, '')) || 0;
        const n = parseFloat(nInput.value.replace(/,/g, '')) || 0;

        if (!calcVcRadio.checked && vc <= 0) {
            showError('All values must be positive numbers', vcInput);
            return;
        }
        if (!calcDRadio.checked && d <= 0) {
            showError('All values must be positive numbers', dInput);
            return;
        }
        if (!calcNRadio.checked && n <= 0) {
            showError('All values must be positive numbers', nInput);
            return;
        }

        if (calcVcRadio.checked) {
            const calculatedVc = (Math.PI * d * n) / 1000;
            if (isNaN(calculatedVc) || calculatedVc <= 0) {
                showError('Invalid calculation: resulting vc is not positive', vcInput);
                return;
            }
            vcInput.value = calculatedVc.toFixed(3);
        } else if (calcDRadio.checked) {
            const calculatedD = (vc * 1000) / (Math.PI * n);
            if (isNaN(calculatedD) || calculatedD <= 0) {
                showError('Invalid calculation: resulting d is not positive', dInput);
                return;
            }
            dInput.value = calculatedD.toFixed(3);
        } else if (calcNRadio.checked) {
            const calculatedN = (vc * 1000) / (Math.PI * d);
            if (isNaN(calculatedN) || calculatedN <= 0) {
                showError('Invalid calculation: resulting n is not positive', nInput);
                return;
            }
            nInput.value = Math.round(calculatedN);
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

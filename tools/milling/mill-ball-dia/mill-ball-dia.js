document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculate-btn');
    const deffInput = document.getElementById('deff');
    const dInput = document.getElementById('d');
    const apInput = document.getElementById('ap');
    const calcDeffRadio = document.getElementById('calc-deff');
    const calcDRadio = document.getElementById('calc-d');
    const calcApRadio = document.getElementById('calc-ap');
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-message';
    document.querySelector('.calculator-content').appendChild(resultDiv);

    // Add onclick event to auto-highlight content
    [deffInput, dInput, apInput].forEach(input => {
        input.onclick = function() {
            this.select();
        };
    });

    function updateInputStates() {
        if (calcDeffRadio.checked) {
            deffInput.disabled = true;
            dInput.disabled = false;
            apInput.disabled = false;
        } else if (calcDRadio.checked) {
            deffInput.disabled = false;
            dInput.disabled = true;
            apInput.disabled = false;
        } else if (calcApRadio.checked) {
            deffInput.disabled = false;
            dInput.disabled = false;
            apInput.disabled = true;
        }
        deffInput.style.backgroundColor = '';
        dInput.style.backgroundColor = '';
        apInput.style.backgroundColor = '';
        resultDiv.textContent = '';
    }

    calculateBtn.addEventListener('click', calculate);
    [calcDeffRadio, calcDRadio, calcApRadio].forEach(radio => {
        radio.addEventListener('change', updateInputStates);
    });
    updateInputStates();

    [deffInput, dInput, apInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });

    function calculate() {
        resultDiv.textContent = '';
        deffInput.style.backgroundColor = '';
        dInput.style.backgroundColor = '';
        apInput.style.backgroundColor = '';

        const deff = parseFloat(deffInput.value.replace(/,/g, '')) || 0;
        const d = parseFloat(dInput.value.replace(/,/g, '')) || 0;
        const ap = parseFloat(apInput.value.replace(/,/g, '')) || 0;

        if (!calcDeffRadio.checked && deffInput.disabled === false && deff <= 0) {
            showError('All values must be positive numbers', deffInput);
            return;
        }
        if (!calcDRadio.checked && dInput.disabled === false && d <= 0) {
            showError('All values must be positive numbers', dInput);
            return;
        }
        if (!calcApRadio.checked && apInput.disabled === false && ap <= 0) {
            showError('All values must be positive numbers', apInput);
            return;
        }
        if (!calcApRadio.checked && !calcDRadio.checked && ap > d/2) {
            showError('ap must be ≤ d/2 for valid results', apInput);
            return;
        }
        if (!calcDeffRadio.checked && !calcDRadio.checked && deff > d) {
            showError('Deff must be ≤ d for valid results', deffInput);
            return;
        }

        if (calcDeffRadio.checked) {
            const calculatedDeff = 2 * Math.sqrt(ap * (d - ap));
            if (isNaN(calculatedDeff) || calculatedDeff <= 0) {
                showError('Invalid calculation: resulting Deff is not positive', deffInput);
                return;
            }
            if (calculatedDeff > d) {
                showError('Deff must be ≤ d for valid results', deffInput);
                return;
            }
            deffInput.value = calculatedDeff.toFixed(3);
        } else if (calcDRadio.checked) {
            const calculatedD = (Math.pow(deff / 2, 2) + Math.pow(ap, 2)) / ap;
            if (isNaN(calculatedD) || calculatedD <= 0) {
                showError('Invalid calculation: resulting d is not positive', dInput);
                return;
            }
            if (calculatedD < deff) {
                showError('d must be ≥ Deff for valid results', dInput);
                return;
            }
            if (ap > calculatedD / 2) {
                showError('ap must be ≤ d/2 for valid results', apInput);
                return;
            }
            dInput.value = calculatedD.toFixed(3);
        } else if (calcApRadio.checked) {
            const a = 1;
            const b = -d;
            const c = Math.pow(deff / 2, 2);

            const discriminant = b * b - 4 * a * c;

            if (discriminant < 0) {
                showError('No valid ap exists for these parameters', apInput);
                return;
            }

            const ap1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const ap2 = (-b - Math.sqrt(discriminant)) / (2 * a);

            const validAps = [];
            if (ap1 > 0 && ap1 <= d / 2) validAps.push(ap1.toFixed(3));
            if (ap2 > 0 && ap2 <= d / 2 && Math.abs(ap2 - ap1) > 0.001) validAps.push(ap2.toFixed(3));

            if (validAps.length === 0) {
                showError('No valid ap exists for these parameters', apInput);
            } else {
                apInput.value = validAps[0];
                if (validAps.length > 1) {
                    showResult('Possible ap values: ' + validAps.join(' mm, ') + ' mm');
                }
            }
        }
    }

    function showError(message, inputElement) {
        resultDiv.textContent = message;
        resultDiv.style.color = 'red';
        if (inputElement) {
            inputElement.style.backgroundColor = '#e84855';
        }
    }

    function showResult(message) {
        resultDiv.textContent = message;
        resultDiv.style.color = '#0066cc';
    }
});
